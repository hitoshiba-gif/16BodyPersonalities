/**
 * i18n.js - 軽量多言語対応システム
 *
 * 機能:
 * - デフォルトは何もしない（日本語テキストそのまま）
 * - ?lang=ko の時だけ韓国語に切り替え
 * - localStorageで言語設定を保存
 */

(function() {
  'use strict';

  const I18N = {
    defaultLang: 'ja',
    supportedLangs: ['ja', 'ko'],
    storageKey: 'user_lang',
    currentLang: null,
    translations: null,

    init() {
      // 言語を検出
      this.currentLang = this.detectLanguage();

      // 日本語の場合は何もしない（デフォルトのHTMLをそのまま表示）
      if (this.currentLang === 'ja') {
        this.translations = window.translations && window.translations.ja ? window.translations.ja : null;
        this.setGlobalVariables();
        document.documentElement.lang = 'ja';
        this.updateLanguageSwitcher();
        console.log('[i18n] 日本語表示（デフォルト）');
        // 初期化完了イベントを発火
        window.dispatchEvent(new CustomEvent('i18nReady'));
        return;
      }

      // 韓国語の場合のみ翻訳を適用
      try {
        this.loadTranslations(this.currentLang);
        this.translatePage();
        this.setGlobalVariables();
        document.documentElement.lang = this.currentLang;
        this.updateLanguageSwitcher();
        console.log(`[i18n] 言語設定完了: ${this.currentLang}`);
      } catch (error) {
        console.error('[i18n] 翻訳読み込みエラー:', error);
      }

      // 初期化完了イベントを発火
      window.dispatchEvent(new CustomEvent('i18nReady'));
    },

    detectLanguage() {
      // 1. URLパラメータ
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get('lang');
      if (urlLang && this.supportedLangs.includes(urlLang)) {
        localStorage.setItem(this.storageKey, urlLang);
        return urlLang;
      }

      // 2. localStorage
      const savedLang = localStorage.getItem(this.storageKey);
      if (savedLang && this.supportedLangs.includes(savedLang)) {
        return savedLang;
      }

      // 3. デフォルト
      return this.defaultLang;
    },

    loadTranslations(lang) {
      // グローバル変数から翻訳データを読み込む（CORS回避）
      if (window.translations && window.translations[lang]) {
        this.translations = window.translations[lang];
      } else {
        throw new Error(`Translation data for ${lang} not found`);
      }
    },

    translatePage() {
      if (!this.translations) return;

      // data-i18n属性を持つ要素を翻訳
      document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.dataset.i18n;
        const translation = this.getNestedValue(this.translations, key);

        if (translation) {
          // HTMLタグを含む場合はinnerHTML、そうでなければtextContent
          if (translation.includes('<')) {
            element.innerHTML = translation;
          } else {
            element.textContent = translation;
          }
        }
      });

      // data-i18n-placeholder属性
      document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.dataset.i18nPlaceholder;
        const translation = this.getNestedValue(this.translations, key);
        if (translation) element.placeholder = translation;
      });

      // data-i18n-title属性
      document.querySelectorAll('[data-i18n-title]').forEach(element => {
        const key = element.dataset.i18nTitle;
        const translation = this.getNestedValue(this.translations, key);
        if (translation) element.title = translation;
      });

      // data-i18n-aria-label属性
      document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
        const key = element.dataset.i18nAriaLabel;
        const translation = this.getNestedValue(this.translations, key);
        if (translation) element.setAttribute('aria-label', translation);
      });
    },

    getNestedValue(obj, path) {
      return path.split('.').reduce((current, key) => current?.[key], obj);
    },

    setGlobalVariables() {
      // CODE_META（既存JavaScriptとの互換性）
      if (this.translations.codeMeta) {
        window.CODE_META = this.translations.codeMeta;
      }

      // 現在の言語
      window.currentLang = this.currentLang;
      window.i18n = this;
    },

    updateLanguageSwitcher() {
      document.querySelectorAll('.lang-switch').forEach(link => {
        const lang = link.dataset.lang;
        if (lang === this.currentLang) {
          link.classList.add('active');
          link.style.fontWeight = 'bold';
        } else {
          link.classList.remove('active');
          link.style.fontWeight = 'normal';
        }
      });
    },

    switchLanguage(lang) {
      if (!this.supportedLangs.includes(lang)) return;
      const url = new URL(window.location.href);
      url.searchParams.set('lang', lang);
      window.location.href = url.toString();
    },

    t(key) {
      if (!this.translations) return key;
      return this.getNestedValue(this.translations, key) || key;
    }
  };

  // 初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => I18N.init());
  } else {
    I18N.init();
  }

  // グローバルに公開
  window.I18N = I18N;
})();
