// Vercel Serverless Function for Azure OpenAI API calls
export default async function handler(req, res) {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 只允许 POST 请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 从环境变量获取配置
        const apiKey = process.env.AZURE_OPENAI_API_KEY;
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

        if (!apiKey || !endpoint) {
            return res.status(500).json({ 
                error: 'Server configuration incomplete',
                message: 'Azure OpenAI API configuration missing'
            });
        }

        // 获取请求参数
        const { messages, max_tokens = 150, temperature = 0.3 } = req.body;

        if (!messages) {
            return res.status(400).json({ error: 'Messages parameter required' });
        }

        // 调用 Azure OpenAI API
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey
            },
            body: JSON.stringify({
                messages,
                max_tokens,
                temperature,
                top_p: 0.9,
                frequency_penalty: 0,
                presence_penalty: 0
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Azure OpenAI API Error:', errorData);
            return res.status(response.status).json({ 
                error: 'API call failed',
                status: response.status,
                message: 'Failed to get response from Azure OpenAI'
            });
        }

        const data = await response.json();
        
        // 返回处理后的结果
        res.status(200).json({
            success: true,
            content: data.choices?.[0]?.message?.content || '',
            usage: data.usage
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'An unexpected error occurred'
        });
    }
}