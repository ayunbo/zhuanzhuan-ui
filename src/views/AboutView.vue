<template>
  <div class="about-page">
    <section class="about-card">
      <p class="eyebrow">Campus Resale</p>
      <h1>让校园里的闲置重新流动起来</h1>
      <p class="description">
        转转校园用户端聚焦商品浏览、发布、认证与个人中心等核心流程，设计方向参考电商化二手交易平台，并保留校园场景的轻量感与信任感。
      </p>
    </section>
  </div>
</template>

<style scoped>
.about-page {
  display: grid;
}

.about-card {
  padding: 36px;
  border-radius: 32px;
  background:
    radial-gradient(circle at top right, rgba(255, 225, 79, 0.6), transparent 30%),
    linear-gradient(135deg, #fffef7 0%, #fff7d7 100%);
  border: 1px solid rgba(22, 22, 22, 0.08);
  box-shadow: 0 18px 40px rgba(22, 22, 22, 0.08);
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8b7b42;
}

.about-card h1 {
  margin: 0;
  color: #161616;
  font-size: clamp(32px, 5vw, 54px);
  line-height: 1.08;
}

.description {
  max-width: 760px;
  margin: 18px 0 0;
  color: #5b5642;
  font-size: 16px;
  line-height: 1.8;
}
</style>
