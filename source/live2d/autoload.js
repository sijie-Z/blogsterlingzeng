/*!
 * Live2D Widget
 * https://github.com/stevenjoezhang/live2d-widget
 */

// Recommended to use absolute path for live2d_path parameter
// live2d_path 参数建议使用绝对路径
// Swup 换页会重新执行本脚本：顶层 const 重复声明会抛 SyntaxError，重复初始化会产生多个宠物
(() => {
  if (window.__live2dAutoloaded) return;
  window.__live2dAutoloaded = true;

  const live2d_path = '/live2d/';
  // 系统开启“减少动态效果”时,模型只渲染一帧静态图,不持续动画
  window.__l2dReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
// const live2d_path = '/dist/';

// Method to encapsulate asynchronous resource loading
// 封装异步加载资源的方法
function loadExternalResource(url, type) {
  return new Promise((resolve, reject) => {
    let tag;

    if (type === 'css') {
      tag = document.createElement('link');
      tag.rel = 'stylesheet';
      tag.href = url;
    }
    else if (type === 'js') {
      tag = document.createElement('script');
      tag.type = 'module';
      tag.src = url;
    }
    if (tag) {
      tag.onload = () => resolve(url);
      tag.onerror = () => reject(url);
      document.head.appendChild(tag);
    }
  });
}

(async () => {
  // If you are concerned about display issues on mobile devices, you can use screen.width to determine whether to load
  // 如果担心手机上显示效果不佳，可以根据屏幕宽度来判断是否加载
  // if (screen.width < 768) return;
  // 省流模式下不加载 4MB 的模型
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection && connection.saveData) return;
  // 手机/平板不加载模型:遮挡内容且流量成本高
  if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) return;

  // Avoid cross-origin issues with image resources
  // 避免图片资源跨域问题
  const OriginalImage = window.Image;
  window.Image = function(...args) {
    const img = new OriginalImage(...args);
    img.crossOrigin = "anonymous";
    return img;
  };
  window.Image.prototype = OriginalImage.prototype;
  // Load waifu.css and waifu-tips.js
  // 加载 waifu.css 和 waifu-tips.js
  await Promise.all([
    loadExternalResource(live2d_path + 'waifu.css?v=20261022b', 'css'),
    loadExternalResource(live2d_path + 'waifu-tips.js?v=20261022a', 'js')
  ]);
  // For detailed usage of configuration options, see README.en.md
  // 配置选项的具体用法见 README.md
  const boot = () => initWidget({
    waifuPath: live2d_path + 'waifu-tips.json?v=20261021',
    cdnPath: '/live2d/',
    // cdnPath: 'https://fastly.jsdelivr.net/gh/fghrsh/live2d_api/',
    cubism2Path: live2d_path + 'live2d.min.js',
    cubism5Path: live2d_path + 'live2dcubismcore.min.js',

    tools: ['hitokoto', 'asteroids', 'photo', 'info', 'quit'],
    logLevel: 'warn',
    drag: false,
  });
  // 等页面 load 后空闲再初始化,避免 4MB 模型抢首屏带宽
  if (document.readyState === 'complete') {
    boot();
  } else {
    window.addEventListener('load', () => {
      if ('requestIdleCallback' in window) requestIdleCallback(boot, { timeout: 2000 });
      else setTimeout(boot, 300);
    }, { once: true });
  }
})();

console.log(`\n%cLive2D%cWidget%c\n`, 'padding: 8px; background: #cd3e45; font-weight: bold; font-size: large; color: white;', 'padding: 8px; background: #ff5450; font-size: large; color: #eee;', '');
})();

/*
く__,.ヘヽ.        /  ,ー､ 〉
         ＼ ', !-─‐-i  /  /´
         ／｀ｰ'       L/／｀ヽ､
       /   ／,   /|   ,   ,       ',
     ｲ   / /-‐/  ｉ  L_ ﾊ ヽ!   i
      ﾚ ﾍ 7ｲ｀ﾄ   ﾚ'ｧ-ﾄ､!ハ|   |
        !,/7 '0'     ´0iソ|    |
        |.从"    _     ,,,, / |./    |
        ﾚ'| i＞.､,,__  _,.イ /   .i   |
          ﾚ'| | / k_７_/ﾚ'ヽ,  ﾊ.  |
            | |/i 〈|/   i  ,.ﾍ |  i  |
           .|/ /  ｉ：    ﾍ!    ＼  |
            kヽ>､ﾊ    _,.ﾍ､    /､!
            !'〈//｀Ｔ´', ＼ ｀'7'ｰr'
            ﾚ'ヽL__|___i,___,ンﾚ|ノ
                ﾄ-,/  |___./
                'ｰ'    !_,.:
*/
