# SoloMD — 自定义 OpenAI 兼容 Provider 功能 + 打包记录

> 日期: 2026-07-30

---

## 一、项目结构概览

### 前端核心文件

| 文件 | 作用 |
|------|------|
| `app/src/lib/ai-providers.ts` | Provider 注册表，定义 14+1 个 provider 的 id、label、apiFormat、defaultModel、defaultBaseUrl、modelHint、signupUrl |
| `app/src/stores/settings.ts` | Pinia 设置 store，持久化到 localStorage (`solomd.settings.v1`)，包含 `aiEnabled`、`aiProvider`、`aiModel`、`aiBaseUrl` |
| `app/src/components/AISettings.vue` | AI 设置面板 UI：provider 下拉、模型输入、base URL、API key 管理、Ollama 检测/拉取 |
| `app/src/components/AgentSetupWizard.vue` | 首次运行引导向导（仅支持 anthropic/openai/gemini/deepseek 四个快速选项） |
| `app/src/i18n/*.ts` | 14 种语言的翻译文件（en/zh/ja/ko/de/fr/es/pt/it/pl/nl/tr/sv/uk） |

### Rust 后端核心文件

| 文件 | 作用 |
|------|------|
| `app/src-tauri/src/ai_proxy.rs` (~2470 行) | AI 代理核心：`ai_rewrite`、`ai_chat`、`ai_verify_key`、`ai_set_key`、`ai_has_key`、`ai_clear_key`、`ai_cancel`。三种 wire format：`run_openai()`、`run_anthropic()`、`run_ollama()` |
| `app/src-tauri/src/ai_keystore.rs` | 双层密钥存储：OS keyring (主) + 加密文件 (备, Android) |
| `app/src-tauri/src/pricing.rs` | 硬编码的 per-provider 费率表，未知 pair 返回 `(0.0, 0.0)` |
| `app/src-tauri/src/recipes.rs` / `recipe_runner.rs` | YAML 自动化 recipe，provider 字段为 `Option<String>`，支持任意字符串 |

### 类型系统

```
ProviderId = 'openai' | 'anthropic' | 'gemini' | 'xai' | 'mistral' | 'groq'
           | 'deepseek' | 'qwen' | 'glm' | 'kimi' | 'volcengine' | 'siliconflow'
           | 'openrouter' | 'ollama' | 'custom'   // ← 新增

ApiFormat  = 'openai' | 'anthropic' | 'ollama'
```

---

## 二、已完成的代码修改

### 2.1 `app/src/lib/ai-providers.ts`

- `ProviderId` 联合类型新增 `'custom'`
- `PROVIDERS` 数组末尾新增条目：
  ```ts
  {
    id: 'custom',
    label: '自定义 OpenAI 兼容 / Custom OpenAI Compatible',
    apiFormat: 'openai',
    defaultModel: '',
    modelHint: '',
  }
  ```
  没有 `defaultBaseUrl`、`signupUrl`、`modelHint` — 用户必须自行填写。

### 2.2 `app/src/components/AISettings.vue`

- 新增 `isCustom` computed property
- **模型输入 placeholder**: custom 时显示 `gpt-4o, deepseek-chat, qwen-plus …`
- **Base URL 标签**: custom 时切换为 `ai.baseUrlRequired`（"接口地址（必填）"）
- **Base URL placeholder**: custom 时显示 `https://your-api-host.com/v1`
- **提示文字**: custom 时显示 `ai.customHint`（"任何 OpenAI 兼容的接口。请填写下方的接口地址和模型名称。"）
- **按钮保护**: custom 且 base URL 为空时，禁用「保存并验证」和「测试连接」按钮

### 2.3 所有 14 个 i18n 文件

每个文件新增两个 key：
- `ai.baseUrlRequired` — "Base URL (required)" / "接口地址（必填）" 等
- `ai.customHint` — "Any OpenAI-compatible endpoint..." / "任何 OpenAI 兼容的接口..." 等

已修改文件清单（共 16 个）：
```
app/src/lib/ai-providers.ts
app/src/components/AISettings.vue
app/src/i18n/zh.ts
app/src/i18n/en.ts
app/src/i18n/ja.ts
app/src/i18n/ko.ts
app/src/i18n/de.ts
app/src/i18n/fr.ts
app/src/i18n/es.ts
app/src/i18n/pt.ts
app/src/i18n/it.ts
app/src/i18n/pl.ts
app/src/i18n/nl.ts
app/src/i18n/tr.ts
app/src/i18n/sv.ts
app/src/i18n/uk.ts
```

---

## 三、端到端验证结论

| 环节 | 状态 | 说明 |
|------|------|------|
| 前端 Provider 查找 | ✅ | `providerById('custom')` 正确返回配置 |
| 设置持久化 | ✅ | `aiProvider` 是 `string` 类型，无需改动 |
| Settings UI 切换 | ✅ | `onProviderChange` 正确重置 model/baseUrl 为空 |
| Key 存储 | ✅ | `ai-custom` 独立 keychain 槽位 |
| Rust 路由 | ✅ | `api_format: "openai"` 正确路由到 `run_openai()` |
| Base URL 解析 | ✅ | 用户填写的 URL 正确传递 |
| 验证连接 | ✅ | `GET {base}/models` 对任意 OpenAI 兼容端点通用 |
| 定价 | ✅ | 未知 provider 返回 $0（诚实而非错误） |
| Recipe 支持 | ✅ | YAML 中 `provider: custom` 自动走 openai 格式 |
| AgentSetupWizard | ✅ | 有意排除 custom，初学者不需要 |
| Rust 后端代码 | ✅ | 无需修改，现有架构天然支持 |

---

## 四、编译打包 ✅ 已完成

### 编译环境

| 组件 | 路径 | 版本 |
|------|------|------|
| Rust 工具链 | `D:\Software\solomd\dependent\rustup\` | stable-x86_64-pc-windows-msvc, rustc 1.97.1 |
| Cargo | `D:\Software\solomd\dependent\cargo\` | cargo 1.97.1 |
| VS Build Tools | `D:\Software\solomd\dependent\vs-buildtools\` | MSVC 14.44.35207 |
| MinGW-w64 (备用) | `D:\Software\solomd\dependent\mingw64\` | gcc 14.2.0 |
| pnpm | `D:\Software\solomd\dependent\pnpm\` | — |
| Windows SDK | `C:\Program Files (x86)\Windows Kits\10\` | 10.0.22621.0 |

### 遇到的问题（已解决）

1. **GNU coreutils `link.exe` 冲突** — `/usr/bin/link` 优先于 MSVC `link.exe`，需在 PATH 中将 MSVC 目录前置
2. **GNU 工具链 `dlltool.exe` 失败** — MinGW self-contained 目录的工具运行时依赖缺失，后切换回 MSVC
3. **GNU 工具链导出符号超限** — `export ordinal too large: 108888`，Tauri 在 Windows 上仅支持 MSVC
4. **MCP sidecar 缺失** — 需要将 `solomd-mcp.exe` 复制为 `binaries/solomd-mcp-x86_64-pc-windows-msvc.exe`
5. **前端未嵌入 exe** — `cargo build --release` 不会执行 `beforeBuildCommand`，也不会嵌入前端资源。必须用 `npx tauri build` 才能将 `app/dist/` 前端打包进 exe。运行时表现为打开 exe 后显示"localhost 拒绝连接"
6. **pnpm 在 bash 中不可用** — 通过 npm 全局安装的 pnpm 只有 `.cmd` 包装器，Git Bash 中无法直接调用。解决方法：临时清空 `tauri.conf.json` 的 `beforeBuildCommand`（因为前端已手动构建），用 `npx tauri build` 打包

### 编译产物

```
D:\Software\solomd\SoloMD_4.10.2_custom-provider_x64-portable\
├── SoloMD.exe        (21 MB) — 主程序 + 前端 + custom OpenAI 兼容 provider
└── solomd-mcp.exe    (3.1 MB) — MCP sidecar
```

> 21 MB vs 原版 17 MB 的差异来自前端资源嵌入（`cargo build` 不嵌入前端，`tauri build` 会嵌入）。

### 编译命令速查

**⚠️ 必须用 `npx tauri build`，不能用 `cargo build --release`（后者不嵌入前端）**

```bash
export RUSTUP_HOME="D:/Software/solomd/dependent/rustup"
export CARGO_HOME="D:/Software/solomd/dependent/cargo"
export PATH="/d/Software/solomd/dependent/vs-buildtools/VC/Tools/MSVC/14.44.35207/bin/Hostx64/x64:/c/Program Files (x86)/Windows Kits/10/bin/10.0.22621.0/x64:/d/Software/solomd/dependent/cargo/bin:$PATH"
cd "D:/Software/solomd/solomd/app"
npx tauri build
```

> **注意**:
> - PATH 中 MSVC 目录必须在 `/usr/bin` 之前，否则 GNU coreutils 的 `link.exe` 会被优先找到
> - 如果 pnpm 不可用，需临时将 `tauri.conf.json` 的 `beforeBuildCommand` 和 `beforeBundleCommand` 设为空字符串 `""`，前端已提前用 `npx vite build` 构建好在 `app/dist/` 中
> - 打包完成后记得恢复 `tauri.conf.json`

---

## 五、修改 diff 摘要

```
 app/src/components/AISettings.vue | 16 +++++++++++-----
 app/src/i18n/de.ts                |  2 ++
 app/src/i18n/en.ts                |  2 ++
 app/src/i18n/es.ts                |  2 ++
 app/src/i18n/fr.ts                |  2 ++
 app/src/i18n/it.ts                |  2 ++
 app/src/i18n/ja.ts                |  2 ++
 app/src/i18n/ko.ts                |  2 ++
 app/src/i18n/nl.ts                |  2 ++
 app/src/i18n/pl.ts                |  2 ++
 app/src/i18n/pt.ts                |  2 ++
 app/src/i18n/sv.ts                |  2 ++
 app/src/i18n/tr.ts                |  2 ++
 app/src/i18n/uk.ts                |  2 ++
 app/src/i18n/zh.ts                |  2 ++
 app/src/lib/ai-providers.ts       | 13 ++++++++++++-
 16 files changed, 51 insertions(+), 6 deletions(-)
```

---

## 六、依赖安装目录结构

```
D:\Software\solomd\dependent\
├── cargo\              — Cargo 二进制 + crate registry
├── rustup\             — Rust 工具链数据
├── pnpm\               — pnpm 包管理器
├── mingw64\            — MinGW-w64 (备用，编译 Tauri 不可用)
├── vs-buildtools\      — Visual Studio Build Tools 2022
├── vs-layout\          — VS 离线布局缓存
└── vs_BuildTools.exe   — VS 安装器
```
