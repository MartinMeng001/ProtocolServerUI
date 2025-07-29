# 部署指南

## 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

## 构建步骤

1. 安装依赖
```bash
npm install
```

2. 构建生产版本
```bash
npm run build
```

3. 部署到服务器
将 `dist` 目录内容上传到 Web 服务器

## Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /ws {
        proxy_pass http://backend:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```
