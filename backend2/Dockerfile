# Используем официальный образ Node.js
FROM node:18-alpine

# Создаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь проект
COPY . .

# Указываем порт, который слушает приложение
EXPOSE 3004

# Запускаем сервер (контейнер стартует с этим процессом)
CMD ["npm", "run", "start"]
