import {createApp} from 'vue';
import App from './App.vue';
import './styles/app.css';
import {t,initLocale} from './i18n/index.js';
import {startDomLocale} from './i18n/dom.js';
initLocale();
window.floorplanTranslate=t;
const app=createApp(App);
app.config.globalProperties.$t=t;
app.mount('#app');

startDomLocale();
