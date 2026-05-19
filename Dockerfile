# Node.js'in hafif ve güvenli alpine sürümünü taban alıyoruz
FROM node:20-alpine

# Konteyner içinde projemizin çalışacağı klasör
WORKDIR /app


COPY package*.json ./

# Sadece üretim için gerekli kütüphaneleri kuruyoruz
RUN npm install --production

# Projedeki tüm kaynak kodları içeriyi aktarıyoruz
COPY . .

# Uygulamanın dış dünyaya açılacağı portu belirtiyoruz
EXPOSE 3000

# Konteyner ayağa kalktığında çalışacak ana komut
CMD ["node", "app.js"]