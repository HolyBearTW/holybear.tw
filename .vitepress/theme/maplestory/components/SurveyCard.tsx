import React from 'react';

const SurveyCard: React.FC = () => {
  return (
    <section className="maple-survey-card" aria-labelledby="maple-survey-title">
      <a className="maple-survey-card-link" href="/survey/">
        <div className="maple-survey-card-header">
        <div>
          <p className="maple-survey-eyebrow">HOLYBEARTW FEEDBACK</p>
          <h2 id="maple-survey-title">HolyBearTW 戰力分析滿意度與未來開發意願調查</h2>
          <p className="maple-survey-description">想了解大家目前對 HolyBearTW 戰力分析的使用感受，以及未來是否希望本站持續維護與開發。問卷約 1 分鐘，回覆僅用於網站功能規劃與服務改善。</p>
        </div>
        <span className="maple-survey-toggle">填寫問卷 <span aria-hidden="true">→</span></span>
        </div>
      </a>
    </section>
  );
};

export default SurveyCard;
