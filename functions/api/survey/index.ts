import type { AppPagesFunction } from '../../_shared/env';
import { errorResponse, json, methodNotAllowed, HttpError } from '../../_shared/http';
import {
  createSurveyIpFingerprint,
  deriveSurveyRiskFlags,
  parseSurveySubmission,
  readSurveyAbuseSignals,
  recordSurveyAbuseEvent,
  surveyCooldownSince,
  verifySurveyTurnstile,
  type SurveySubmission,
} from '../../_shared/survey';

export const onRequestPost: AppPagesFunction = async ({ env, request }) => {
  try {
    if (!env.SURVEY_DB) throw new HttpError(503, 'survey_storage_unavailable', '問卷資料庫尚未設定');
    const ipFingerprint = await createSurveyIpFingerprint(request, env.SURVEY_FINGERPRINT_SECRET);

    let submission: SurveySubmission;
    try {
      submission = await parseSurveySubmission(request);
    } catch (error) {
      await recordSurveyAbuseEvent(env.SURVEY_DB, ipFingerprint, 'schema_invalid');
      throw error;
    }

    try {
      await verifySurveyTurnstile(request, env);
    } catch (error) {
      if (error instanceof HttpError && ['turnstile_required', 'turnstile_rejected'].includes(error.code)) {
        await recordSurveyAbuseEvent(env.SURVEY_DB, ipFingerprint, 'turnstile_failed');
      }
      throw error;
    }

    const cooldownSince = surveyCooldownSince();
    const signals = await readSurveyAbuseSignals(env.SURVEY_DB, ipFingerprint, cooldownSince);
    const riskFlags = deriveSurveyRiskFlags(signals);
    const result = await env.SURVEY_DB.prepare(`
      INSERT OR IGNORE INTO survey_responses (
        anonymous_id,
        usage_frequency,
        satisfaction_score,
        support_continue,
        future_use_intent,
        improvement_feedback,
        other_feedback,
        ip_fingerprint,
        risk_flags,
        is_suspicious
      )
      SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10
      WHERE NOT EXISTS (
        SELECT 1 FROM survey_responses
        WHERE anonymous_id = ?11
          OR (ip_fingerprint = ?12 AND created_at >= ?13)
      )
    `).bind(
      submission.anonymousId,
      submission.usageFrequency,
      submission.satisfactionScore,
      submission.supportContinue,
      submission.futureUseIntent,
      submission.improvementFeedback,
      submission.otherFeedback,
      ipFingerprint,
      riskFlags.join(','),
      riskFlags.length ? 1 : 0,
      submission.anonymousId,
      ipFingerprint,
      cooldownSince,
    ).run();

    if (!result.meta.changes) {
      const duplicateBrowser = await env.SURVEY_DB.prepare(
        'SELECT id FROM survey_responses WHERE anonymous_id = ?1 LIMIT 1',
      ).bind(submission.anonymousId).first<{ id: number }>();
      if (duplicateBrowser) {
        await recordSurveyAbuseEvent(env.SURVEY_DB, ipFingerprint, 'duplicate_browser');
        throw new HttpError(409, 'survey_already_submitted', '此瀏覽器已提交過問卷');
      }

      const networkCooldown = await env.SURVEY_DB.prepare(
        'SELECT id FROM survey_responses WHERE ip_fingerprint = ?1 AND created_at >= ?2 LIMIT 1',
      ).bind(ipFingerprint, cooldownSince).first<{ id: number }>();
      if (networkCooldown) {
        await recordSurveyAbuseEvent(env.SURVEY_DB, ipFingerprint, 'network_cooldown');
        throw new HttpError(429, 'SURVEY_NETWORK_COOLDOWN', '此網路近期已提交過問卷，請稍後再試。');
      }

      throw new HttpError(409, 'survey_submission_conflict', '問卷送出時發生衝突，請稍後再試');
    }

    return json({
      ok: true,
      message: '感謝你的回饋！你的意見會作為後續功能規劃參考。',
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['POST']);
