---
title: About Me
image: /holybear.png
description: HolyBear's personal space for technology, life, and creative work.
head:
  - - meta
    - name: robots
      content: max-image-preview:none
sidebar: false
aside: false
toc: false
class: about-page
pageClass: custom-footer-layout
---

<div class="about-hero">
  <img class="about-hero__image" src="/holybear.png" alt="HolyBear character artwork" />
  <div class="about-hero__overlay"></div>
  <div class="about-hero__content">
    <p style="margin: 0 0 1rem; letter-spacing: .18em; text-transform: uppercase; opacity: .82; font-size: clamp(.78rem, 2.8vw, .95rem);">About HolyBear</p>
    <h1 style="margin: 0 0 1rem; font-size: clamp(2.2rem, 9vw, 4.5rem); line-height: 1.02; text-wrap: balance;">I turn technology, life, and creativity into a little universe of my own</h1>
    <p style="margin: 0 auto; max-width: 780px; opacity: .92; font-size: clamp(.98rem, 3.6vw, 1.08rem); line-height: 1.8;">
      I love blending technology, everyday life, and creative work. This website is my personal laboratory—a place for lessons learned, the satisfaction of finishing something, and small moments worth remembering.
    </p>
  </div>
</div>

<style>
.about-hero {
  position: relative;
  border-radius: clamp(20px, 4vw, 32px);
  min-height: clamp(520px, 78vh, 980px);
  margin-bottom: 2.5rem;
  color: white;
  display: flex;
  align-items: center;
  overflow: hidden;
  isolation: isolate;
}

.about-hero__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 32%;
  transform: translateZ(0);
  z-index: -2;
  margin: 0 !important;
  display: block;
}

.about-hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.22));
  z-index: -1;
}

.about-hero__content {
  max-width: 960px;
  margin: 0 auto;
  text-align: center;
  width: 100%;
  padding: clamp(48px, 9vw, 100px) clamp(16px, 4vw, 24px);
}

@media (max-width: 767px) {
  .about-hero {
    min-height: 0 !important;
    height: 500px !important;
    border-radius: 20px !important;
    margin-bottom: 1.5rem !important;
  }

  .about-hero__content {
    padding-top: 28px !important;
    padding-bottom: 28px !important;
  }

  .about-hero__image {
    object-fit: cover !important;
    object-position: center 24% !important;
    transform: scale(1) !important;
  }

  .about-hero__content p:first-child {
    margin-bottom: 0.65rem !important;
  }

  .about-hero__content h1 {
    margin-bottom: 0.75rem !important;
    font-size: clamp(1.8rem, 8vw, 2.4rem) !important;
  }

  .about-hero__content p:last-child {
    font-size: 0.95rem !important;
    line-height: 1.65 !important;
  }
}
</style>

## What I Care About

- **Android and HyperOS customization**: From module development to system optimization, I enjoy exploring mobile internals and thoughtful UI interactions.
- **Frontend and web development**: I use VitePress, Vue, and React to present content and give every project a clean, polished home.
- **Creating and documenting**: I do more than write code—I turn ideas, experiences, and experiments into articles worth revisiting.

## My Style

The things I share here are:

- Direct and genuine
- A little ACG-inspired, while staying practical
- Focused on presenting honest thoughts in the clearest way possible

## What I Do

1. Build websites and technical documentation
2. Write Blog notes and experiment logs
3. Create Android modules, tools, and small projects
4. Design user experiences with personality

## If You Want to Reach Me

- Start by exploring the work and writing on this site
- I am always happy to talk about open source, Android, the web, or creative work
- This is my little home base and the place where I most enjoy sharing what I make
- The image above is my character artwork—I hope it helps the site feel a little more personal.

> My Telegram QR code is below. Feel free to add me, and please let me know where you found me!

<img src="/image/about/holybear_tg.png" alt="HolyBear Telegram QR code" />
