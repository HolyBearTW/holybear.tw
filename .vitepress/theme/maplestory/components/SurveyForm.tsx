import React from 'react';

const STORAGE_KEY = 'holybear.survey.anonymous-id';
const SURVEY_SUBMIT_ERROR_MESSAGE = '目前無法再次提交問卷，請稍後再試。';

type TurnstileWidget = {
  render: (container: HTMLElement, options: {
    sitekey: string;
    callback: (token: string) => void;
    'expired-callback'?: () => void;
    'error-callback'?: () => void;
  }) => string;
  reset?: (widgetId?: string) => void;
  remove?: (widgetId?: string) => void;
};

type TurnstileWindow = Window & { turnstile?: TurnstileWidget };

const createAnonymousId = () => {
  if (typeof window === 'undefined') return '';
  const cryptoApi = window.crypto;
  if (typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const readAnonymousId = () => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
    const generated = createAnonymousId();
    if (generated) window.localStorage.setItem(STORAGE_KEY, generated);
    return generated;
  } catch {
    return createAnonymousId();
  }
};

const loadTurnstileScript = () => new Promise<void>((resolve, reject) => {
  const existing = document.querySelector<HTMLScriptElement>('script[data-hb-turnstile]');
  if (existing) {
    if ((window as TurnstileWindow).turnstile) resolve();
    else {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('turnstile_script_failed')), { once: true });
    }
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async = true;
  script.defer = true;
  script.dataset.hbTurnstile = 'true';
  script.onload = () => resolve();
  script.onerror = () => reject(new Error('turnstile_script_failed'));
  document.head.appendChild(script);
});

const initialForm = {
  usageFrequency: '',
  satisfactionScore: '',
  supportContinue: '',
  futureUseIntent: '',
  improvementFeedback: '',
  otherFeedback: '',
};

const SurveyForm: React.FC = () => {
  const [form, setForm] = React.useState(initialForm);
  const [anonymousId, setAnonymousId] = React.useState('');
  const [siteKey, setSiteKey] = React.useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = React.useState('');
  const [captchaState, setCaptchaState] = React.useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [status, setStatus] = React.useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const captchaRef = React.useRef<HTMLDivElement>(null);
  const widgetIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    setAnonymousId(readAnonymousId());
    let cancelled = false;
    fetch('/api/survey/site-key', { headers: { accept: 'application/json' }, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('survey_config_failed');
        return response.json() as Promise<{ siteKey?: string | null }>;
      })
      .then(async ({ siteKey: configuredSiteKey }) => {
        if (cancelled) return;
        if (!configuredSiteKey) {
          setCaptchaState('unavailable');
          return;
        }
        setSiteKey(configuredSiteKey);
        await loadTurnstileScript();
        if (!cancelled) setCaptchaState('ready');
      })
      .catch(() => {
        if (!cancelled) setCaptchaState('unavailable');
      });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (captchaState !== 'ready' || !siteKey || !captchaRef.current || widgetIdRef.current) return;
    const turnstile = (window as TurnstileWindow).turnstile;
    if (!turnstile) {
      setCaptchaState('unavailable');
      return;
    }
    widgetIdRef.current = turnstile.render(captchaRef.current, {
      sitekey: siteKey,
      callback: (token) => setTurnstileToken(token),
      'expired-callback': () => setTurnstileToken(''),
      'error-callback': () => {
        setTurnstileToken('');
        setCaptchaState('unavailable');
      },
    });
    return () => {
      if (widgetIdRef.current && turnstile.remove) turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [captchaState, siteKey]);

  const update = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setStatus(null);
  };

  const resetCaptcha = () => {
    setTurnstileToken('');
    const turnstile = (window as TurnstileWindow).turnstile;
    if (widgetIdRef.current && turnstile?.reset) turnstile.reset(widgetIdRef.current);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!anonymousId || !turnstileToken || submitting) return;
    setSubmitting(true);
    setStatus(null);
    try {
      const response = await fetch('/api/survey', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-turnstile-token': turnstileToken,
        },
        body: JSON.stringify({
          anonymousId,
          usageFrequency: form.usageFrequency,
          satisfactionScore: Number(form.satisfactionScore),
          supportContinue: form.supportContinue,
          futureUseIntent: form.futureUseIntent,
          improvementFeedback: form.improvementFeedback,
          otherFeedback: form.otherFeedback,
        }),
      });
      if (!response.ok) {
        // Keep backend anti-abuse details (code/message) out of the public UI.
        await response.arrayBuffer().catch(() => undefined);
        throw new Error(SURVEY_SUBMIT_ERROR_MESSAGE);
      }
      setStatus({ type: 'success', message: '感謝你的回饋！你的意見會作為後續功能規劃參考。' });
      setForm(initialForm);
      resetCaptcha();
    } catch (error) {
      resetCaptcha();
      // Submission failures are intentionally indistinguishable to visitors:
      // do not reveal browser/network/IP/fingerprint/rate-limit/Turnstile clues.
      setStatus({ type: 'error', message: SURVEY_SUBMIT_ERROR_MESSAGE });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="maple-survey-form" onSubmit={submit}>
      <fieldset>
        <legend>1. 你目前是否仍會使用 HolyBearTW 戰力分析？<span aria-hidden="true"> *</span></legend>
        {[
          ['frequent', '經常使用'], ['occasional', '偶爾使用'], ['rare', '很少使用'], ['stopped', '已停止使用'],
        ].map(([value, label]) => <label key={value}><input required type="radio" name="usageFrequency" checked={form.usageFrequency === value} onChange={() => update('usageFrequency', value)} />{label}</label>)}
      </fieldset>
      <fieldset>
        <legend>2. 你對目前 HolyBearTW 戰力分析的整體滿意度？<span aria-hidden="true"> *</span></legend>
        <div className="maple-survey-score-options">
          {[1, 2, 3, 4, 5].map((score) => <label key={score}><input required type="radio" name="satisfactionScore" value={score} checked={form.satisfactionScore === String(score)} onChange={() => update('satisfactionScore', String(score))} /><span>{score}</span></label>)}
        </div>
        <div className="maple-survey-score-hint"><span>非常不滿意</span><span>非常滿意</span></div>
      </fieldset>
      <fieldset>
        <legend>3. 你是否支持 HolyBearTW 繼續開發與維護戰力分析工具？<span aria-hidden="true"> *</span></legend>
        {[['support', '支持'], ['indifferent', '無所謂'], ['oppose', '不支持']].map(([value, label]) => <label key={value}><input required type="radio" name="supportContinue" checked={form.supportContinue === value} onChange={() => update('supportContinue', value)} />{label}</label>)}
      </fieldset>
      <fieldset>
        <legend>4. 如果網站之後持續維護，你未來是否仍願意使用？<span aria-hidden="true"> *</span></legend>
        {[['will', '會'], ['depends', '視功能改善情況而定'], ['uncertain', '不確定'], ['will_not', '不會']].map(([value, label]) => <label key={value}><input required type="radio" name="futureUseIntent" checked={form.futureUseIntent === value} onChange={() => update('futureUseIntent', value)} />{label}</label>)}
      </fieldset>
      <label className="maple-survey-textarea-label">5. 你最希望改善或新增什麼？<textarea maxLength={2000} value={form.improvementFeedback} onChange={(event) => update('improvementFeedback', event.target.value)} rows={4} /></label>
      <label className="maple-survey-textarea-label">6. 有沒有其他想對站長說的話？<textarea maxLength={2000} value={form.otherFeedback} onChange={(event) => update('otherFeedback', event.target.value)} rows={4} /></label>
      <div ref={captchaRef} className="maple-survey-captcha" aria-live="polite" />
      {captchaState === 'loading' && <p className="maple-survey-help">正在準備問卷驗證…</p>}
      {captchaState === 'unavailable' && <p className="maple-survey-error">{SURVEY_SUBMIT_ERROR_MESSAGE}</p>}
      {status && <p className={status.type === 'success' ? 'maple-survey-success' : 'maple-survey-error'} role="status">{status.message}</p>}
      <button type="submit" className="maple-survey-submit" disabled={submitting || !turnstileToken || captchaState !== 'ready'}>{submitting ? '送出中…' : '送出問卷'}</button>
      <p className="maple-survey-privacy">不收集姓名、Email、帳號、角色名稱或完整 IP；匿名識別碼只用於避免同一瀏覽器重複提交。</p>
    </form>
  );
};

export default SurveyForm;
