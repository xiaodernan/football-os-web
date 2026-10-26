/**
 * Mobile performance optimization utilities
 * 移动端性能优化工具
 */

// 性能监控基准线
export const PERF_BENCHMARKS = {
  // 移动端首屏加载目标 (毫秒)
  firstLoadTarget: 3000,
  // 触摸事件响应目标 (毫秒)
  touchResponseTarget: 100,
  // 动画帧目标 (毫秒)
  animationFrameTarget: 16,
  // 网络请求目标 (毫秒)
  networkRequestTarget: 500,
};

// 触摸事件防抖 hook
export function useTouchThrottle(
  callback: (...args: any[]) => void,
  wait: number = 100
) {
  let timeoutId: NodeJS.Timeout;
  let lastCall = 0;

  return (...args: any[]) => {
    const now = Date.now();
    const waitMs = now - lastCall >= wait ? 0 : wait - (now - lastCall);

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      lastCall = Date.now();
      callback(...args);
    }, waitMs);
  };
}

// CSS 资源懒加载指令
export const lazyLoadCSS = (href: string, media: string = "print") => {
  return new Promise<void>((resolve) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "style";
    link.href = href;
    link.media = media;

    link.onload = () => {
      link.rel = "stylesheet";
      resolve();
    };

    document.head.appendChild(link);
  });
};

// 移动端视口适配
export function setupMobileViewport() {
  if (typeof window === "undefined") return;

  const viewport = document.querySelector("meta[name=viewport]");
  if (viewport) {
    // 确保移动端正确的缩放
    viewport.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    );
  }
}

//  reduced motion 支持检测
export const useReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;

  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  return mq.matches;
}

// 移动端点击延迟取消（针对iOS Safari）
export function fixiOSClickDelay() {
  if (typeof window === "undefined") return;

  const sheets = document.styleSheets;
  for (let i = sheets.length; i-- > 0; ) {
    const rules = sheets[i].rules || sheets[i].cssRules;
    for (let j = rules.length; j-- > 0; ) {
      const rule = rules[j] as CSSStyleRule;
      if (rule.selectorText === "button, a, [role='button']") {
        rule.style.touchAction = "manipulation";
      }
    }
  }
}

// 性能计时工具
export class PerfTimer {
  private marks: Map<string, number> = new Map();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string): number {
    const start = this.marks.get(name);
    if (!start) return 0;
    return performance.now() - start;
  }

  clear(): void {
    this.marks.clear();
  }
}