# YuNi-tab

屿你自定义浏览器新标签页 —— 液态玻璃搜索框 · 旋转辉光边框 · 动态视频壁纸库 · Bing 搜索建议下拉

A liquid-glass browser startpage with dynamic video wallpapers, rotating glow border, and Bing-powered search suggestions.

---

## 功能 Features

| 功能 | 说明 |
|------|------|
| 液态玻璃搜索框 | 毛玻璃质感 + SVG 色散滤镜，输入关键词直达 Bing 搜索 |
| 旋转辉光边框 | 多层锥形渐变绕搜索框旋转，悬停/聚焦时增亮 |
| Bing 搜索建议 | 输入时实时下拉补全，通过后台 Service Worker 代理绕过 CORS |
| 动态视频壁纸 | 支持 mp4/webm 等，IndexedDB 本地壁纸库管理，自动生成封面缩略图 |
| 设置面板 | 右上角齿轮进入，可独立开关玻璃效果、辉光、背景、空闲隐藏等 |
| 空闲隐藏 | 自定义秒数无操作后自动淡出搜索框，鼠标移动即恢复 |

## 安装 Install

1. 下载 `YuNi-tab_v1.0.zip` 并解压
2. 打开 Edge/Chrome，进入 `edge://extensions` 或 `chrome://extensions`
3. 开启右上角「开发人员模式 / Developer mode」
4. 点击「加载解压缩的扩展 / Load unpacked」，选择解压后的文件夹

## 文件结构 Files

manifest.json    扩展配置
newtab.html      新标签页（UI + 样式 + 设置面板）
newtab.js        交互逻辑（搜索建议 / 设置 / 壁纸库 / 空闲隐藏）
worker.js        后台 Service Worker（Bing API 代理）

## 浏览器支持 Browsers

Microsoft Edge / Google Chrome（Chromium 内核，Manifest V3）

## 作者 Author

[Czy](https://czy001.pythonanywhere.com/) — 14岁少年极客 · 湖北十堰

授权协议 | License
本项目在 MIT 许可证 下开源，您可以自由进行二次开发、修改或分发，但必须在衍生项目中保留原作者的版权声明。 
This project is open-sourced under the MIT License. You are free to conduct secondary development, modify, or distribute it, provided that the original author's copyright notice is retained in derivative projects.

郑重声明：本项目仅供技术交流与开源学习使用，严禁将其用于任何违反法律法规及公序良俗的商业或私人用途。 
Solemn Declaration: This project is strictly for technical exchange and open-source learning. It is strictly prohibited to use it for any commercial or private purposes that violate laws, regulations, or public decency.

赞助支持 | Support
如果您认可 Yu-Ni OS 的开源设计理念并希望支持后续的演进，欢迎通过扫描下方渠道提供捐赠：
If you endorse the open-source design philosophy of Yu-Ni OS and wish to support its future evolution, you are welcome to scan the channel below to make a donation:
USDT:
TRC20:TBQ7mRU18cEKv1ABwwSbNrgyyBhczAtGks 
BSC:0xfa21c5a56231680a0b655c3be9d81242764f7c21 or：
<img width="1242" height="1686" alt="603900587-05dbf42a-fbb1-42f4-9740-0119856f7ae1" src="https://github.com/user-attachments/assets/d66068fa-1c54-4045-b0c2-0e4d0048a619" />
