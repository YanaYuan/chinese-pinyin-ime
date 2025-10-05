class ChinesePinyinIME {
    constructor() {
        // 从环境变量或配置中读取API设置
        this.apiEndpoint = this.getApiEndpoint();
        this.apiKey = this.getApiKey();
        
        // 检查API配置是否完整（仅在本地开发环境显示警告）
        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalDev && (!this.apiKey || !this.apiEndpoint)) {
            console.warn('⚠️ API配置未完成，某些功能可能无法使用');
            console.warn('请检查环境变量配置或联系开发者');
            this.showConfigWarning();
        }
        
        // 拼音模式相关状态
        this.isPinyinMode = false;              // 是否在拼音模式
        this.pinyinCorrection = {               // 记录用户的拼音纠正
            segments: [],                       // [{pinyin:'xi', chinese:'西'}, ...]
            currentSelection: null              // 当前选择但未确认的字
        };
        this.originalPinyin = '';               // 原始完整拼音
        this.originalAIResult = '';             // 原始AI结果
        this.dictionary = null;                 // 词库数据
        this.currentDictCandidates = [];        // 当前词库候选列表（完整）
        this.dictCandidatesPage = 0;            // 当前页码（从0开始）
        this.dictCandidatesPerPage = 10;        // 每页显示数量
        
        this.initializeElements();
        this.loadDictionary();                  // 加载词库
        this.bindEvents();
        this.currentSuggestions = [];
        this.selectedIndex = 0; // 当前选中的候选项索引
    }

    // 获取API端点配置
    getApiEndpoint() {
        // 尝试从多个来源获取API端点
        // 1. 从window对象中的配置
        if (window.AZURE_OPENAI_ENDPOINT) {
            return window.AZURE_OPENAI_ENDPOINT;
        }
        
        // 2. 从localStorage中获取
        const saved = localStorage.getItem('azure_openai_endpoint');
        if (saved) return saved;
        
        // 3. 默认提示用户配置
        return null;
    }

    // 获取API密钥配置  
    getApiKey() {
        // 尝试从多个来源获取API密钥
        // 1. 从window对象中的配置
        if (window.AZURE_OPENAI_API_KEY) {
            return window.AZURE_OPENAI_API_KEY;
        }
        
        // 2. 从localStorage中获取（仅用于开发测试，生产环境不推荐）
        const saved = localStorage.getItem('azure_openai_key');
        if (saved) return saved;
        
        // 3. 提示用户配置
        return null;
    }

    // 显示配置警告
    showConfigWarning() {
        const warningHtml = `
            <div class="config-warning" style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 10px 0; border-radius: 5px;">
                <h4 style="color: #856404; margin-top: 0;">⚠️ API配置提醒</h4>
                <p style="color: #856404; margin-bottom: 10px;">
                    当前未检测到Azure OpenAI API配置。要使用AI转换功能，请：
                </p>
                <ol style="color: #856404; margin-bottom: 10px;">
                    <li>联系管理员获取API配置</li>
                    <li>或使用本地词库功能（无需API）</li>
                </ol>
                <button onclick="this.parentElement.style.display='none'" style="background: #ffc107; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                    知道了
                </button>
            </div>
        `;
        
        const container = document.querySelector('.container') || document.body;
        const warningDiv = document.createElement('div');
        warningDiv.innerHTML = warningHtml;
        container.insertBefore(warningDiv, container.firstChild);
    }

    initializeElements() {
        this.pinyinInput = document.getElementById('pinyin-input');
        this.suggestionsDiv = document.getElementById('suggestions');
        this.textOutput = document.getElementById('text-output');
        this.clearBtn = document.getElementById('clear-btn');
        this.copyBtn = document.getElementById('copy-btn');
        this.statusDiv = document.getElementById('status');
        
        // 拼音模式相关元素
        this.pinyinModeIndicator = document.getElementById('pinyin-mode-indicator');
        this.dictCorrectionSection = document.getElementById('dict-correction-section');
        this.correctionPinyinInput = document.getElementById('correction-pinyin-input');
        this.dictCandidatesDiv = document.getElementById('dict-candidates');
    }

    // 统一的API调用方法
    async callOpenAI(messages, options = {}) {
        const { max_tokens = 150, temperature = 0.3 } = options;
        
        try {
            // 判断是否为生产环境
            const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
            
            // 在本地开发环境检查API配置
            if (!isProduction && (!this.apiKey || !this.apiEndpoint)) {
                throw new Error('API配置未完成，请联系管理员');
            }
            
            if (isProduction) {
                // 使用 Vercel serverless function
                const response = await fetch('/api/openai', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messages,
                        max_tokens,
                        temperature
                    })
                });
                
                if (!response.ok) {
                    let errorMessage = `API请求失败: ${response.status}`;
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorData.error || errorMessage;
                        console.error('API Error Details:', errorData);
                    } catch (e) {
                        console.error('Failed to parse error response:', e);
                    }
                    throw new Error(errorMessage);
                }
                
                const data = await response.json();
                return data.content;
                
            } else {
                // 开发环境直接调用（需要配置CORS）
                const requestBody = {
                    messages,
                    max_tokens,
                    temperature,
                    top_p: 0.9,
                    frequency_penalty: 0,
                    presence_penalty: 0
                };
                
                const response = await fetch(this.apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': this.apiKey
                    },
                    body: JSON.stringify(requestBody)
                });
                
                if (!response.ok) {
                    throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                return data.choices?.[0]?.message?.content || '';
            }
            
        } catch (error) {
            console.error('API调用失败:', error);
            throw error;
        }
    }

    bindEvents() {
        // 实时转换（输入时自动转换）
        this.pinyinInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            if (value.length > 0) {
                this.debounce(() => {
                    this.convertPinyin(); // 实时转换，会显示候选词
                }, 1000)();
                
                // 如果在拼音模式，同时更新词库候选
                if (this.isPinyinMode) {
                    this.updateDictCandidates(value);
                }
            } else {
                this.hideSuggestions();
                if (this.isPinyinMode) {
                    this.dictCandidatesDiv.innerHTML = '<div class="dict-placeholder">输入拼音查看候选</div>';
                }
            }
        });

        // Tab键监听器 - 循环选择候选项
        this.pinyinInput.addEventListener('keydown', (e) => {
            // 纠错模式下禁用Tab键，避免与纠错逻辑冲突
            if (e.key === 'Tab' && this.isPinyinMode) {
                e.preventDefault();
                return;
            }
            
            if (e.key === 'Tab' && this.suggestionsDiv.classList.contains('show')) {
                e.preventDefault(); // 阻止默认的Tab行为
                this.selectNextOption();
            } else if (e.key === ' ' && this.suggestionsDiv.classList.contains('show')) {
                e.preventDefault(); // 阻止默认的空格行为
                this.selectCurrentOption();
            }
        });

        // 清空按钮
        this.clearBtn.addEventListener('click', () => {
            this.clearAll();
        });

        // 复制按钮
        this.copyBtn.addEventListener('click', () => {
            this.copyToClipboard();
        });
        
        // Shift键监听 - 切换拼音模式
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Shift' && !e.repeat) {
                e.preventDefault();
                this.togglePinyinMode();
            }
        });
        
        // 纠正输入框的输入监听
        this.correctionPinyinInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            if (value.length > 0) {
                this.updateDictCandidates(value);
            } else {
                this.dictCandidatesDiv.innerHTML = '<div class="dict-placeholder">输入拼音查看词库候选...</div>';
            }
        });
        
        // 纠正输入框的按键监听 - 数字键选择候选、Enter确认、翻页
        this.correctionPinyinInput.addEventListener('keydown', (e) => {
            if (this.isPinyinMode) {
                const key = e.key;
                // 检查是否按下数字键 1-9
                if (key >= '1' && key <= '9') {
                    e.preventDefault();
                    const index = parseInt(key) - 1;
                    this.selectDictCandidateByIndex(index);
                }
                // Enter键确认当前选择的字
                else if (key === 'Enter') {
                    e.preventDefault();
                    this.confirmCurrentSegment();
                }
                // = 键下一页
                else if (key === '=') {
                    e.preventDefault();
                    this.nextDictPage();
                }
                // - 键上一页
                else if (key === '-') {
                    e.preventDefault();
                    this.prevDictPage();
                }
            }
        });
    }

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async convertPinyin() {
        const pinyin = this.pinyinInput.value.trim();
        
        if (!pinyin) {
            this.showStatus('请输入拼音', 'error');
            return;
        }

        try {
            this.showStatus('正在转换...', 'loading');

            const result = await this.callOpenAI(pinyin);
            
            this.displaySuggestions(result.suggestions || []);
            
            this.showStatus('转换成功！', 'success');
            
        } catch (error) {
            console.error('转换失败:', error);
            this.showStatus('AI转换失败，可使用拼音模式（按Shift）', 'error');
            
            // 即使AI失败，如果在拼音模式下，词库候选仍然可用
            if (this.isPinyinMode) {
                console.log('AI失败但拼音模式可用');
            }
        }
    }

    async callOpenAI(pinyin) {
        const prompt = `请将拼音"${pinyin}"转换为中文。只返回1个跟拼音最匹配的候选，不要其他说明。`;

        const requestBody = {
            messages: [
                {
                    role: "system",
                    content: "你是一个专业的中文拼音输入法转换器。请将用户输入的拼音转换为对应的中文字符。"
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 150,
            temperature: 0.3,
            top_p: 0.9
        };

        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': this.apiKey
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('API响应数据:', data); // 添加调试日志
        
        // 检查数据结构是否符合预期
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            console.error('API响应结构异常:', data);
            throw new Error('API响应格式不正确');
        }
        
        const content = data.choices[0].message.content.trim();

        // 直接使用AI返回的内容作为第一个候选词
        const firstSuggestion = content;
        const finalSuggestions = [firstSuggestion];
        
        // 立即显示第一个选项
        this.displaySuggestions(finalSuggestions, false);
        
        return { suggestions: finalSuggestions };
    }

    async getOptimizedText(text) {
        const prompt = `请将以下文字改为更口语化、通顺、易理解的表达方式。只返回优化后的文字，不要其他说明：${text}`;

        const requestBody = {
            messages: [
                {
                    role: "system",
                    content: "你是一个专业的中文表达优化专家。请将用户提供的文字改为更口语化、通顺、易理解的表达方式。"
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 100,
            temperature: 0.5,
            top_p: 0.9
        };

        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': this.apiKey
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`优化API请求失败: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('优化API响应数据:', data); // 添加调试日志
        
        // 检查数据结构是否符合预期
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            console.error('优化API响应结构异常:', data);
            throw new Error('优化API响应格式不正确');
        }
        
        return data.choices[0].message.content.trim();
    }

    async getExpandedText(text) {
        const prompt = `我给你一个词语："${text}"，请你用这个词语开头，在后面续写内容形成一个完整的句子。

要求：
1. 必须以"${text}"开头
2. 后面续写一句简短自然的话
3. 只返回完整的句子，不要解释


现在请处理："${text}"`;

        const requestBody = {
            messages: [
                {
                    role: "system",
                    content: "帮用户把没说完的话补充完整。请将用户提供的词语开头，续写一句简短自然的话。"
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 80,
            temperature: 0.7,
            top_p: 0.9
        };

        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': this.apiKey
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`扩展API请求失败: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('扩展API响应数据:', data); // 添加调试日志
        
        // 检查数据结构是否符合预期
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            console.error('扩展API响应结构异常:', data);
            throw new Error('扩展API响应格式不正确');
        }
        
        let result = data.choices[0].message.content.trim();
        
        // 移除引号（如果AI返回时包含了引号）
        result = result.replace(/^["']|["']$/g, '');
        
        // 去除标点符号的辅助函数
        const removePunctuation = (str) => str.replace(/[，。、！？；：""''「」『』（）【】]/g, '');
        
        // 确保结果以原文开头，如果不是则手动添加
        const textWithoutPunc = removePunctuation(text);
        const resultWithoutPunc = removePunctuation(result);
        
        if (!resultWithoutPunc.startsWith(textWithoutPunc)) {
            // 如果结果包含原文但不在开头，重新组织
            if (resultWithoutPunc.includes(textWithoutPunc)) {
                // 找到原文在结果中的位置，保留其后的内容
                const index = result.indexOf(textWithoutPunc);
                if (index > 0) {
                    const suffix = result.substring(index + textWithoutPunc.length);
                    result = text + suffix;
                }
            } else {
                // 如果完全不包含原文，直接添加原文和适当的连接
                const connector = /^[，。、！？]/.test(result) ? '' : '，';
                result = text + connector + result;
            }
        }
        
        return result;
    }

    selectNextOption() {
        // 循环选择下一个候选项
        const items = this.suggestionsDiv.querySelectorAll('.suggestion-item');
        if (items.length === 0) return;

        // 移除当前选中状态
        if (this.selectedIndex < items.length && items[this.selectedIndex]) {
            items[this.selectedIndex].classList.remove('selected');
        }
        
        // 计算下一个选项的索引
        const nextIndex = (this.selectedIndex + 1) % 3; // 最多3个选项，循环
        
        // 如果下一个选项还不存在，先生成它
        if (nextIndex >= this.currentSuggestions.length && nextIndex < 3) {
            this.selectedIndex = nextIndex;
            
            // 立即显示一个加载中的占位符
            this.showLoadingOption(nextIndex);
            
            // 然后异步生成真实内容
            this.generateMoreOptions();
            return;
        }
        
        // 如果选项已存在，直接更新选中状态
        this.selectedIndex = nextIndex;
        const updatedItems = this.suggestionsDiv.querySelectorAll('.suggestion-item');
        if (updatedItems[this.selectedIndex]) {
            updatedItems[this.selectedIndex].classList.add('selected');
        }
    }

    showLoadingOption(index) {
        const loadingText = index === 1 ? '正在优化中...' : '正在扩展中...';
        const item = document.createElement('span');
        item.className = 'suggestion-item loading-item selected';
        item.textContent = loadingText;
        item.title = index === 1 ? '口语化优化' : '扩展表达';
        this.suggestionsDiv.appendChild(item);
    }

    async generateMoreOptions() {
        // 检查是否已经有第一个选项
        const firstSuggestion = this.currentSuggestions[0];
        if (!firstSuggestion) return;

        // 根据selectedIndex决定生成哪个选项
        if (this.selectedIndex === 1 && this.currentSuggestions.length === 1) {
            // 生成第二个选项（口语化优化版本）
            try {
                const optimizedText = await this.getOptimizedText(firstSuggestion);
                if (optimizedText && optimizedText !== firstSuggestion) {
                    // 移除加载占位符
                    const loadingItem = this.suggestionsDiv.querySelector('.loading-item');
                    if (loadingItem) {
                        loadingItem.remove();
                    }
                    
                    // 添加真实内容
                    this.currentSuggestions.push(optimizedText);
                    this.createSuggestionItem(optimizedText, 1);
                    
                    // 设置为选中状态
                    const items = this.suggestionsDiv.querySelectorAll('.suggestion-item');
                    if (items[1]) {
                        items[1].classList.add('selected');
                    }
                }
            } catch (error) {
                console.log('生成优化文本失败:', error);
                // 移除加载占位符
                const loadingItem = this.suggestionsDiv.querySelector('.loading-item');
                if (loadingItem) {
                    loadingItem.remove();
                }
            }
        } else if (this.selectedIndex === 2 && this.currentSuggestions.length === 2) {
            // 生成第三个选项（扩展表达版本）
            try {
                const expandedText = await this.getExpandedText(firstSuggestion);
                if (expandedText && expandedText !== firstSuggestion) {
                    // 移除加载占位符
                    const loadingItem = this.suggestionsDiv.querySelector('.loading-item');
                    if (loadingItem) {
                        loadingItem.remove();
                    }
                    
                    // 添加真实内容
                    this.currentSuggestions.push(expandedText);
                    this.createSuggestionItem(expandedText, 2);
                    
                    // 设置为选中状态
                    const items = this.suggestionsDiv.querySelectorAll('.suggestion-item');
                    if (items[2]) {
                        items[2].classList.add('selected');
                    }
                }
            } catch (error) {
                console.log('生成扩展文本失败:', error);
                // 移除加载占位符
                const loadingItem = this.suggestionsDiv.querySelector('.loading-item');
                if (loadingItem) {
                    loadingItem.remove();
                }
            }
        }
    }

    selectCurrentOption() {
        // 选择当前选中的选项并添加到输出
        if (this.currentSuggestions && this.currentSuggestions.length > this.selectedIndex) {
            const selectedSuggestion = this.currentSuggestions[this.selectedIndex];
            this.textOutput.value += selectedSuggestion;
            this.pinyinInput.value = ''; // 清空输入框
            this.hideSuggestions(); // 隐藏候选词
            this.selectedIndex = 0; // 重置选中索引
            this.pinyinInput.focus(); // 重新聚焦输入框
        }
    }

    selectFirstOption() {
        // 兼容性方法，选择第一个选项
        this.selectedIndex = 0;
        this.selectCurrentOption();
    }

    
    showStatus(message, type = 'info') {
        const container = document.getElementById('suggestionsContainer');
        let statusElement = document.getElementById('statusMessage');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'statusMessage';
            statusElement.className = 'status-message';
            container.appendChild(statusElement);
        }
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
    }
    
    hideStatus() {
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.remove();
        }
    }

    displaySuggestions(suggestions, isIncremental = false) {
        if (!isIncremental) {
            this.currentSuggestions = suggestions;
            this.selectedIndex = 0; // 重置选中索引
        }
        
        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        // 只在非增量模式时清空容器
        if (!isIncremental) {
            this.suggestionsDiv.innerHTML = '';
            // 重新创建所有选项
            suggestions.forEach((suggestion, index) => {
                this.createSuggestionItem(suggestion, index);
            });
        } else {
            // 增量模式：只添加新选项，完全不触碰现有DOM
            const currentItemCount = this.suggestionsDiv.querySelectorAll('.suggestion-item').length;
            
            suggestions.forEach((suggestion, suggestionIndex) => {
                const actualIndex = currentItemCount + suggestionIndex;
                this.createSuggestionItem(suggestion, actualIndex);
                
                // 更新当前选项列表
                if (!this.currentSuggestions) {
                    this.currentSuggestions = [];
                }
                this.currentSuggestions.push(suggestion);
            });
        }

        // 只在第一次显示时添加 show 类
        if (!this.suggestionsDiv.classList.contains('show')) {
            this.suggestionsDiv.classList.add('show');
        }
    }

    createSuggestionItem(suggestion, index) {
        const item = document.createElement('span');
        item.className = 'suggestion-item';
        
        if (index === 0) {
            item.textContent = suggestion;
            item.title = '原始转换';
            if (this.selectedIndex === 0) {
                item.classList.add('selected');
            }
        } else if (index === 1) {
            item.textContent = suggestion;
            item.title = '口语化优化';
            if (this.selectedIndex === 1) {
                item.classList.add('selected');
            }
        } else if (index === 2) {
            item.textContent = suggestion;
            item.title = '扩展表达';
            if (this.selectedIndex === 2) {
                item.classList.add('selected');
            }
        }
        
        item.addEventListener('click', () => {
            this.selectSuggestion(suggestion);
        });
        this.suggestionsDiv.appendChild(item);
    }

    selectSuggestion(suggestion) {
        this.textOutput.value += suggestion;
        this.pinyinInput.value = '';
        this.hideSuggestions();
        this.pinyinInput.focus();
    }

    hideSuggestions() {
        this.suggestionsDiv.classList.remove('show');
        this.suggestionsDiv.innerHTML = '';
    }

    showStatus(message, type) {
        this.statusDiv.textContent = message;
        this.statusDiv.className = `status show ${type}`;
        
        // 3秒后自动隐藏状态
        setTimeout(() => {
            this.statusDiv.classList.remove('show');
        }, 3000);
    }

    clearAll() {
        this.pinyinInput.value = '';
        this.textOutput.value = '';
        this.hideSuggestions();
        this.statusDiv.classList.remove('show');
        this.pinyinInput.focus();
    }

    async copyToClipboard() {
        const text = this.textOutput.value;
        if (!text) {
            this.showStatus('没有内容可复制', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            this.showStatus('已复制到剪贴板', 'success');
        } catch (error) {
            // 如果现代API不可用，使用传统方法
            try {
                this.textOutput.select();
                document.execCommand('copy');
                this.showStatus('已复制到剪贴板', 'success');
            } catch (fallbackError) {
                this.showStatus('复制失败', 'error');
            }
        }
    }

    // ========== 拼音模式相关方法 ==========

    async loadDictionary() {
        try {
            const response = await fetch('Pinyin/dict.json');
            this.dictionary = await response.json();
            console.log('词库加载成功，包含词条:', this.dictionary.length);
        } catch (error) {
            console.error('词库加载失败:', error);
            this.showStatus('词库加载失败', 'error');
        }
    }

    togglePinyinMode() {
        if (!this.isPinyinMode) {
            this.enterPinyinMode();
        } else {
            this.exitPinyinModeAndCorrect();
        }
    }

    enterPinyinMode() {
        this.isPinyinMode = true;
        
        // 保存当前状态用于纠正
        this.originalPinyin = this.pinyinInput.value.trim();
        if (this.currentSuggestions.length > 0) {
            this.originalAIResult = this.currentSuggestions[0];
        }
        
        // 更新UI - 显示纠正输入区域
        this.pinyinInput.classList.add('pinyin-mode');
        this.pinyinModeIndicator.style.display = 'inline-block';
        this.dictCorrectionSection.style.display = 'block';
        
        // 聚焦到纠正输入框
        this.correctionPinyinInput.value = '';
        this.correctionPinyinInput.focus();
        
        console.log('进入拼音模式 - 原始拼音:', this.originalPinyin, '原始AI结果:', this.originalAIResult);
    }

    async exitPinyinModeAndCorrect() {
        this.isPinyinMode = false;
        
        // 更新UI - 隐藏纠正输入区域
        this.pinyinInput.classList.remove('pinyin-mode');
        this.pinyinModeIndicator.style.display = 'none';
        this.dictCorrectionSection.style.display = 'none';
        
        // 清空纠正输入框并重置样式
        this.correctionPinyinInput.value = '';
        this.correctionPinyinInput.style.color = '';
        this.correctionPinyinInput.style.fontWeight = '';
        this.dictCandidatesDiv.innerHTML = '<div class="dict-placeholder">输入拼音查看词库候选...</div>';
        this.currentDictCandidates = [];
        this.dictCandidatesPage = 0; // 重置页码
        
        // 恢复焦点到主拼音输入框，避免Tab键行为异常
        this.pinyinInput.focus();
        
        console.log('退出拼音模式');
        
        // 如果有纠正信息，触发AI纠正
        if (this.pinyinCorrection.segments.length > 0 && this.originalAIResult) {
            this.showStatus('正在智能纠正...', 'loading');
            await this.correctWithAI();
            // 清空纠正信息
            this.pinyinCorrection.segments = [];
            this.pinyinCorrection.currentSelection = null;
        } else if (this.pinyinCorrection.segments.length === 0) {
            this.showStatus('未选择任何纠正字', 'error');
        }
    }

    getDictCandidates(pinyin) {
        if (!this.dictionary) return [];
        
        console.log('🔍 [v2] getDictCandidates input:', pinyin); // Force cache bust
        
        const normalizedPinyin = pinyin.toLowerCase().replace(/\s+/g, '');
        
        return this.dictionary
            .filter(entry => {
                const entryPinyinNoSpace = entry.Pinyin.toLowerCase().replace(/\s+/g, '');
                const entryPinyinWithSpace = entry.Pinyin.toLowerCase();
                const inputLower = pinyin.toLowerCase();
                
                // 完全匹配：拼音完全相同（去空格后）
                // Example: "xi" === "xi"
                if (entryPinyinNoSpace === normalizedPinyin) {
                    return true;
                }
                
                // 音节边界匹配：词组的第一个音节匹配
                // Example: "xi an".startsWith("xi ") → true
                // Counter: "xia".startsWith("xi ") → false
                if (entryPinyinWithSpace.startsWith(inputLower + ' ')) {
                    return true;
                }
                
                return false;
            })
            .sort((a, b) => {
                const aPinyin = a.Pinyin.toLowerCase().replace(/\s+/g, '');
                const bPinyin = b.Pinyin.toLowerCase().replace(/\s+/g, '');
                
                const aExactMatch = aPinyin === normalizedPinyin;
                const bExactMatch = bPinyin === normalizedPinyin;
                
                // 完全匹配优先
                if (aExactMatch && !bExactMatch) return -1;
                if (!aExactMatch && bExactMatch) return 1;
                
                // 同级别内按频率排序（高频在前）
                return b.Frequency - a.Frequency;
            });
            // 不再slice，返回所有候选，分页在显示时处理
    }

    updateDictCandidates(pinyin) {
        if (!this.isPinyinMode) return;
        
        const candidates = this.getDictCandidates(pinyin);
        this.currentDictCandidates = candidates; // 存储完整候选列表
        this.dictCandidatesPage = 0; // 重置到第一页
        
        this.renderDictCandidatesPage();
    }
    
    renderDictCandidatesPage() {
        const candidates = this.currentDictCandidates;
        this.dictCandidatesDiv.innerHTML = '';
        
        if (candidates.length === 0) {
            this.dictCandidatesDiv.innerHTML = '<div class="dict-placeholder">未找到匹配的词条</div>';
            return;
        }
        
        // 计算分页
        const totalPages = Math.ceil(candidates.length / this.dictCandidatesPerPage);
        const startIndex = this.dictCandidatesPage * this.dictCandidatesPerPage;
        const endIndex = Math.min(startIndex + this.dictCandidatesPerPage, candidates.length);
        const pageCandidates = candidates.slice(startIndex, endIndex);
        
        // 显示页码信息
        const pageInfo = document.createElement('div');
        pageInfo.className = 'dict-page-info';
        pageInfo.innerHTML = `
            <span>第 ${this.dictCandidatesPage + 1}/${totalPages} 页</span>
            <span class="dict-page-hint">[-上页 =下页]</span>
            <span class="dict-total">共${candidates.length}个候选</span>
        `;
        this.dictCandidatesDiv.appendChild(pageInfo);
        
        // 显示当前页的候选
        pageCandidates.forEach((candidate, index) => {
            const globalIndex = startIndex + index;
            const displayNumber = (index + 1) % 10; // 1-9, 0表示第10个
            
            const item = document.createElement('div');
            item.className = 'dict-candidate-item';
            item.innerHTML = `
                <span class="dict-number">[${displayNumber === 0 ? '0' : displayNumber}]</span>
                <span class="dict-word">${candidate.Chinese}</span>
                <span class="dict-pinyin">${candidate.Pinyin}</span>
            `;
            
            item.addEventListener('click', () => {
                this.selectDictCandidate(candidate.Chinese);
            });
            
            this.dictCandidatesDiv.appendChild(item);
        });
    }
    
    nextDictPage() {
        const totalPages = Math.ceil(this.currentDictCandidates.length / this.dictCandidatesPerPage);
        if (this.dictCandidatesPage < totalPages - 1) {
            this.dictCandidatesPage++;
            this.renderDictCandidatesPage();
        } else {
            this.showStatus('已经是最后一页', 'info');
        }
    }
    
    prevDictPage() {
        if (this.dictCandidatesPage > 0) {
            this.dictCandidatesPage--;
            this.renderDictCandidatesPage();
        } else {
            this.showStatus('已经是第一页', 'info');
        }
    }
    
    selectDictCandidateByIndex(index) {
        // 计算当前页的实际索引
        const startIndex = this.dictCandidatesPage * this.dictCandidatesPerPage;
        const globalIndex = startIndex + index;
        
        if (!this.currentDictCandidates || globalIndex >= this.currentDictCandidates.length) {
            console.log('索引超出范围:', globalIndex);
            return;
        }
        
        const candidate = this.currentDictCandidates[globalIndex];
        this.selectDictCandidate(candidate.Chinese);
    }

    selectDictCandidate(word) {
        // 从纠正输入框获取用户输入的拼音
        const correctedPinyin = this.correctionPinyinInput.value.trim();
        
        if (!correctedPinyin) {
            this.showStatus('请先输入拼音', 'error');
            return;
        }
        
        // 暂存当前选择（未确认）
        this.pinyinCorrection.currentSelection = {
            pinyin: correctedPinyin,
            chinese: word
        };
        
        console.log('暂存选择:', word, '拼音:', correctedPinyin);
        
        // 高亮显示选中的汉字
        this.correctionPinyinInput.value = `${correctedPinyin} → ${word}`;
        this.correctionPinyinInput.style.color = '#2e7d32';
        this.correctionPinyinInput.style.fontWeight = 'bold';
        
        // 更新累积显示
        this.updateSegmentsDisplay();
        
        this.showStatus(`✓ 已选择: ${word}，按Enter确认`, 'success');
    }
    
    confirmCurrentSegment() {
        // 确认当前选择的字，加入segments数组
        if (!this.pinyinCorrection.currentSelection) {
            this.showStatus('请先选择一个汉字', 'error');
            return;
        }
        
        // 添加到segments数组
        this.pinyinCorrection.segments.push({
            pinyin: this.pinyinCorrection.currentSelection.pinyin,
            chinese: this.pinyinCorrection.currentSelection.chinese
        });
        
        console.log('已确认:', this.pinyinCorrection.currentSelection, '累积:', this.pinyinCorrection.segments);
        
        // 清空当前选择
        this.pinyinCorrection.currentSelection = null;
        
        // 清空输入框并重置样式
        this.correctionPinyinInput.value = '';
        this.correctionPinyinInput.style.color = '';
        this.correctionPinyinInput.style.fontWeight = '';
        
        // 清空候选列表
        this.dictCandidatesDiv.innerHTML = '<div class="dict-placeholder">输入拼音查看词库候选...</div>';
        this.currentDictCandidates = [];
        
        // 更新累积显示
        this.updateSegmentsDisplay();
        
        // 聚焦回输入框
        this.correctionPinyinInput.focus();
        
        const segmentsText = this.pinyinCorrection.segments.map(s => s.chinese).join('');
        this.showStatus(`✓ 已确认，当前累积: ${segmentsText}，继续输入或按Shift完成`, 'success');
    }
    
    updateSegmentsDisplay() {
        // 在纠正区域显示已累积的字
        let displayHTML = '';
        
        if (this.pinyinCorrection.segments.length > 0) {
            const segmentsText = this.pinyinCorrection.segments
                .map(s => `${s.chinese}(${s.pinyin})`)
                .join(' + ');
            displayHTML = `<div class="segments-display">已确认: ${segmentsText}</div>`;
        }
        
        if (this.pinyinCorrection.currentSelection) {
            displayHTML += `<div class="current-selection">当前选择: ${this.pinyinCorrection.currentSelection.chinese}(${this.pinyinCorrection.currentSelection.pinyin}) [按Enter确认]</div>`;
        }
        
        // 在dict-candidates上方显示
        const existingDisplay = document.querySelector('.correction-segments-display');
        if (existingDisplay) {
            existingDisplay.innerHTML = displayHTML;
        } else if (displayHTML) {
            const displayDiv = document.createElement('div');
            displayDiv.className = 'correction-segments-display';
            displayDiv.innerHTML = displayHTML;
            this.dictCorrectionSection.insertBefore(displayDiv, this.dictCandidatesDiv);
        }
    }

    async correctWithAI() {
        if (this.pinyinCorrection.segments.length === 0 || !this.originalAIResult) return;
        
        // 合并所有segments
        const correctedPinyin = this.pinyinCorrection.segments.map(s => s.pinyin).join('');
        const userChoice = this.pinyinCorrection.segments.map(s => s.chinese).join('');
        
        const prompt = `你是一个智能拼音输入法纠错助手。

【原始输入】
拼音：${this.originalPinyin}
AI转换：${this.originalAIResult}

【用户纠正】
拼音片段：${correctedPinyin}
用户选择：${userChoice}

【任务】
根据用户的纠正，修改AI转换结果中对应的错误部分。
只返回修改后的完整句子，不要任何解释、引号或标点。

【示例】
原始拼音：wo jiao wang xiao ming
AI转换：我叫王小明
用户纠正：wangxiaoming → 汪晓明
正确输出：我叫汪晓明

现在请处理：`;

        try {
            const requestBody = {
                messages: [
                    {
                        role: "system",
                        content: "你是一个专业的拼音输入法纠错助手。根据用户提供的纠正信息，修改AI转换结果中的错误部分。"
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 150,
                temperature: 0.3,
                top_p: 0.9
            };

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': this.apiKey
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`纠错API请求失败: ${response.status}`);
            }

            const data = await response.json();
            const correctedText = data.choices[0].message.content.trim();
            
            // 更新第一个AI候选
            if (this.currentSuggestions.length > 0) {
                this.currentSuggestions[0] = correctedText;
                
                // 重新显示候选，保留生成后续选项的能力
                // 清空并重置为只包含纠正后的第一个选项
                this.currentSuggestions = [correctedText];
                this.selectedIndex = 0;
                this.suggestionsDiv.innerHTML = '';
                this.createSuggestionItem(correctedText, 0);
                
                // 确保候选区显示
                if (!this.suggestionsDiv.classList.contains('show')) {
                    this.suggestionsDiv.classList.add('show');
                }
                
                this.showStatus('✓ AI已自动纠正', 'success');
                console.log('AI纠正完成:', correctedText);
            }
            
        } catch (error) {
            console.error('AI纠正失败:', error);
            this.showStatus('纠正失败', 'error');
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new ChinesePinyinIME();
});

// 添加一些快捷键支持
document.addEventListener('keydown', (e) => {
    // Ctrl+L 清空
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        document.getElementById('clear-btn').click();
    }
    
    // Ctrl+C 复制（当焦点在输出框时）
    if (e.ctrlKey && e.key === 'c' && document.activeElement === document.getElementById('text-output')) {
        document.getElementById('copy-btn').click();
    }
});
