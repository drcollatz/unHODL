FROM node:alpine as builder
WORKDIR /usr/src/app
COPY . .
ARG buildmode=
RUN npm install $buildmode


FROM node:alpine
WORKDIR /app
ENV LANG=de_DE.UTF-8 \
    LANGUAGE=de_DE.UTF-8 \
    LC_CTYPE=de_DE.UTF-8 \
    LC_ALL=de_DE.UTF-8
RUN apk add -U tzdata && \
    cp /usr/share/zoneinfo/Europe/Berlin /etc/localtime
COPY --from=builder /usr/src/app /app
VOLUME /app/conf
CMD [ "npm", "start" ]

