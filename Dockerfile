FROM node:18.20.3-alpine3.20
WORKDIR /app

EXPOSE 80
CMD ["npm", "start"]
