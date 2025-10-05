# 🎯 中文拼音输入法 (Chinese Pinyin IME)

基于AI的智能中文拼音输入法Web应用，支持实时拼音转换、候选词选择和拼音纠正功能。

## ✨ 功能特性

- **🔤 拼音转换**: 输入拼音自动转换为中文汉字
- **🤖 AI驱动**: 使用Azure OpenAI提供智能候选词
- **📚 本地词库**: 内置拼音词典，支持离线查询
- **🔧 拼音纠正**: 支持拼音输入纠正功能
- **⌨️ 键盘导航**: 支持方向键选择候选词
- **📱 响应式设计**: 支持桌面和移动设备

## 🚀 在线演示

访问 [您的Vercel部署地址] 体验在线版本

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, Vanilla JavaScript
- **AI服务**: Azure OpenAI (GPT-4)
- **部署**: Vercel
- **数据**: JSON格式拼音词典

## 📦 本地开发

### 前提条件

- Node.js (建议 18+)
- 有效的 Azure OpenAI API 密钥

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <your-repo-url>
   cd chinese-pinyin-ime
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   ```
   
   编辑 `.env` 文件，填入你的 Azure OpenAI 配置：
   ```env
   AZURE_OPENAI_API_KEY=your_actual_api_key
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/openai/deployments/your-model/chat/completions
   AZURE_OPENAI_API_VERSION=2024-10-21
   AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

5. **访问应用**
   
   打开浏览器访问 `http://localhost:8000`

## 🌐 部署到 Vercel

### 自动部署 (推荐)

1. **Fork 这个项目到你的 GitHub**

2. **连接 Vercel**
   - 访问 [Vercel](https://vercel.com)
   - 点击 "New Project"
   - 选择你的 GitHub 仓库
   - Vercel 会自动检测并部署

3. **配置环境变量**
   
   在 Vercel 项目设置中添加以下环境变量：
   ```
   AZURE_OPENAI_API_KEY=your_actual_api_key
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/openai/deployments/your-model/chat/completions
   AZURE_OPENAI_API_VERSION=2024-10-21
   AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
   ```

4. **重新部署**
   
   添加环境变量后，点击 "Redeploy" 使配置生效。

### 手动部署

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录并部署
vercel --prod
```

## 📝 使用说明

### 基本使用

1. **拼音输入**: 在输入框中输入拼音（如 `nihao`）
2. **查看候选**: 系统会显示候选的中文转换
3. **选择候选词**: 
   - 鼠标点击选择
   - 键盘方向键 + Enter 选择
4. **查看结果**: 选中的中文会显示在输出区域

### 高级功能

- **拼音纠正**: 当AI转换不准确时，可以使用拼音纠正功能
- **词库查询**: 支持本地词库的快速查询
- **批量输入**: 可以连续输入多个拼音进行转换

## 🔧 配置说明

### 环境变量

| 变量名 | 描述 | 必需 |
|--------|------|------|
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API 密钥 | ✅ |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI 端点地址 | ✅ |
| `AZURE_OPENAI_API_VERSION` | API 版本 | ✅ |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | 模型部署名称 | ✅ |

### 本地开发配置

对于本地开发，你还可以通过以下方式配置：

```javascript
// 在浏览器控制台中设置（仅用于测试）
window.AZURE_OPENAI_API_KEY = 'your-key';
window.AZURE_OPENAI_ENDPOINT = 'your-endpoint';
```

## 🗂️ 项目结构

```
chinese-pinyin-ime/
├── IME4/                    # 主应用目录
│   ├── index.html          # 主页面
│   ├── script.js           # 主要逻辑
│   ├── style.css           # 样式文件
│   ├── api/
│   │   └── openai.js       # Vercel API 路由
│   ├── Pinyin/
│   │   ├── dict.json       # 拼音词典
│   │   └── ...             # 其他资源
│   └── test_*.html         # 测试页面
├── .env.example            # 环境变量模板
├── .gitignore              # Git 忽略文件
├── package.json            # 项目配置
├── vercel.json             # Vercel 配置
└── README.md               # 项目说明
```

## 🛡️ 安全注意事项

- ✅ API 密钥通过环境变量配置
- ✅ 使用 Vercel Serverless Functions 保护 API 调用
- ✅ 前端不直接暴露 API 密钥
- ✅ 设置了适当的 CORS 和安全头

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

## 📄 许可证

本项目使用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 支持

如果您有任何问题或建议，请：

- 提交 [Issue](../../issues)
- 发送邮件到: [您的邮箱]

## 🙏 致谢

- Azure OpenAI 提供 AI 服务
- Vercel 提供部署平台
- 所有贡献者的支持

---

**⭐ 如果这个项目对您有帮助，请给个 Star！**