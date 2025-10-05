// Vercel Serverless Function for testing API configuration
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

    try {
        // 检查环境变量
        const apiKey = process.env.AZURE_OPENAI_API_KEY;
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
        const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

        res.status(200).json({
            success: true,
            config: {
                hasApiKey: !!apiKey,
                hasEndpoint: !!endpoint,
                hasApiVersion: !!apiVersion,
                hasDeploymentName: !!deploymentName,
                endpointPrefix: endpoint ? endpoint.substring(0, 50) + '...' : 'undefined',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Test API error:', error);
        res.status(500).json({ 
            error: 'Test API error',
            message: error.message
        });
    }
}