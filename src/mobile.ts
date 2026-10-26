/**
 * Mobile-first configuration and utility functions for Football OS
 * 移动端原生体验配置工具
 */

import * as React from "react";

// 检测是否为移动设备
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const toString = Object.prototype.toString;
  return /Mobi|Android|iPhone|iPad/.test(toString.call(navigator.userAgent));
}

// 触摸事件辅助函数
export const touchEvents = {
  start: isMobileDevice() ? "touchstart" : "mousedown",
  move: isMobileDevice() ? "touchmove" : "mousemove",
  end: isMobileDevice() ? "touchend" : "mouseup",
  cancel: isMobileDevice() ? "touchcancel" : "mouseup",
};

// 触摸握手检测 - 判断是点击还是滑动
export function useTouchDetection(
  onClick: () => void,
  onSwipe?: (direction: "up" | "down" | "left" | "right") => void
) {
  const [isTapping, setIsTapping] = React.useState(false);
  const [startX, setStartX] = React.useState(0);
  const [startY, setStartY] = React.useState(0);

  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleStart = (e: Event) => {
      setIsTapping(true);
      const touch = "touches" in e ? (e as TouchEvent).touches[0] : (e as MouseEvent);
      setStartX(touch.clientX);
      setStartY(touch.clientY);

      // 防止在拖动时触发点击
      timeoutId = setTimeout(() => setIsTapping(false), 250);
    };

    const handleEnd = (e: Event) => {
      clearTimeout(timeoutId);

      if (!isTapping) return;
      setIsTapping(false);

      const touch = "touches" in e ? (e as TouchEvent).touches[0] : (e as MouseEvent);
      const diffX = touch.clientX - startX;
      const diffY = touch.clientY - startY;
      const absDiffX = Math.abs(diffX);
      const absDiffY = Math.abs(diffY);

      // 判断为滑动而非点击
      if (absDiffX > 30 || absDiffY > 30) {
        // 检测主要方向
        if (absDiffX > absDiffY) {
          onSwipe?.(diffX > 0 ? "right" : "left");
        } else {
          onSwipe?.(diffY > 0 ? "down" : "up");
        }
      } else {
        // 真正的点击
        onClick();
      }
    };

    const container = document.elementFromPoint(startX, startY);
    if (container) {
      container.addEventListener(touchEvents.start, handleStart);
      container.addEventListener(touchEvents.end, handleEnd);

      return () => {
        if (container) {
          container.removeEventListener(touchEvents.start, handleStart);
          container.removeEventListener(touchEvents.end, handleEnd);
        }
      };
    }
  }, [onClick, onSwipe, isTapping]);

  return isTapping;
}

// 响应式断点
export const breakpoints = {
  sm: "640px", // 小屏幕
  md: "768px", // 中屏幕
  lg: "1024px", // 大屏幕
  xl: "1280px", // 超大屏幕
  "2xl": "1536px", // 超大XX屏幕
};

// 是否在移动端断点内
export function isInBreakpoint(breakpoint: keyof typeof breakpoints): boolean {
  if (typeof window === "undefined") return false;
  const maxWidth = breakpoints[breakpoint];
  if (!maxWidth) return false;
  return window.innerWidth <= parseInt(maxWidth);
}

// 轻量级离线缓存键
export const CACHE_KEYS = {
  PLAYER_PROFILE: "footballos:playerprofile",
  LAST_VIEWED: "footballos:lastviewed",
  WIDGET_STATE: "footballos:widgetstate",
  LEAGUE_DATA: "footballos:leaguedata",
};

// 检查浏览器是否支持离线存储
export function supportsOfflineStorage(): boolean {
  try {
    return "localStorage" in window && window.localStorage !== null;
  } catch {
    return false;
  }
}

// 本地存储工具（带错误处理）
export function safeLocalStorage<T>(key: string, defaultValue: T): [T | null, (value: T) => void] {
  const stored = tryReadStorage(key);
  const value: T = stored !== null ? stored : defaultValue;

  return [
    value,
    (newValue: T) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(newValue));
      } catch (e) {
        console.warn("localStorage write failed", e);
      }
    }
  ];
}

function tryReadStorage(key: string): any {
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}