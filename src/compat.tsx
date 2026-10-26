/**
 * Cross-browser compatibility and feature detection utilities
 * 跨浏览器兼容性与特性检测工具
 */

import { useI18n } from "@/i18n";
import { Panel } from "@/ui/primitives";

// 检测浏览器类型和版本
export const detectBrowser = (): {
  name: "Chrome" | "Firefox" | "Safari" | "Edge" | "Opera" | "Unknown";
  version: string;
  platform: string;
} => {
  const userAgent = navigator.userAgent;

  // Chrome
  if (/Chrome\/[\d.]/.test(userAgent) && !/Edg/.test(userAgent)) {
    return { name: "Chrome", version: userAgent.match(/Chrome\/([\d.]+)/)?.[1] || "unknown", platform: navigator.platform };
  }

  // Edge
  if (/Edg\/[\d.]/.test(userAgent)) {
    return { name: "Edge", version: userAgent.match(/Edg\/([\d.]+)/)?.[1] || "unknown", platform: navigator.platform };
  }

  // Firefox
  if (/Firefox\/[\d.]/.test(userAgent)) {
    return { name: "Firefox", version: userAgent.match(/Firefox\/([\d.]+)/)?.[1] || "unknown", platform: navigator.platform };
  }

  // Safari
  if (/Version\/[\d.].*Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
    return { name: "Safari", version: userAgent.match(/Version\/([\d.]+)/)?.[1] || "unknown", platform: navigator.platform };
  }

  return { name: "Unknown", version: "unknown", platform: navigator.platform };
};

// HTML5 特性检测
export const featureDetect = {
  // Canvas 支持
  canvas: () => {
    const elem = document.createElement("canvas");
    return !!(elem.getContext && elem.getContext("2d"));
  },
  // LocalStorage 支持
  localStorage: () => {
    try {
      return "localStorage" in window && window.localStorage !== null;
    } catch (e) {
      return false;
    }
  },
  // SessionStorage 支持
  sessionStorage: () => {
    try {
      return "sessionStorage" in window && window.sessionStorage !== null;
    } catch (e) {
      return false;
    }
  },
  // CSS Grid 支持
  cssGrid: () => {
    const elem = document.createElement("div");
    elem.style.cssText = "display:grid";
    return elem.style.cssText === "";
  },
  // CSS Variables 支持
  cssVars: () => {
    const elem = document.documentElement;
    try {
      elem.style.setProperty("--test", "abc");
      return window.getComputedStyle(elem).getPropertyValue("--test") === "abc";
    } catch (e) {
      return false;
    }
  },
  // WebGL 支持
  webgl: () => {
    try {
      const canvas = document.createElement("canvas");
      return !!window.WebGLRenderingContext && !!canvas.getContext("webgl");
    } catch (e) {
      return false;
    }
  }
};

// 兼容性提示组件
export function CompatNotice() {
  const { t } = useI18n();
  const browser = detectBrowser();
  const missingFeatures: string[] = [];

  if (!featureDetect.canvas()) missingFeatures.push(t("compat.canvas"));
  if (!featureDetect.localStorage()) missingFeatures.push(t("compat.localStorage"));
  if (!featureDetect.cssGrid()) missingFeatures.push(t("compat.cssGrid"));

  if (missingFeatures.length === 0) return null;

  return (
    <Panel className="p-4 mb-6 border border-warning">
      <div className="flex items-start">
        <div className="w-1 h-1 rounded-full mr-2 bg-warning flex-shrink-0"></div>
        <div>
          <div className="font-medium">{t("compat.compatibilityMode")}</div>
          <p className="text-sm text-warning mt-1">
            {t("compat.detectedBrowser", { browser: browser.name, version: browser.version })}。
          </p>
          {missingFeatures.map((f, i) => (
            <Key key={i}>{f}</Key>
          ))}
        </div>
      </div>
    </Panel>
  );
}

// 用于 JSX 的简单 Key 组件
function Key({ children }: { children: string }) {
  return <span className="text-xs text-warning mr-2">{children}</span>;
}