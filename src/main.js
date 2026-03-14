import './assets/main.css'
import 'element-plus/dist/index.css'
import './assets/element-theme.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'

import App from './App.vue'
import router from './router'

import Vant from 'vant'
import 'vant/lib/index.css'
const app = createApp(App)

app.use(createPinia())
app.use(ElementPlus)
app.use(router)
app.use(Vant)
app.mount('#app')
