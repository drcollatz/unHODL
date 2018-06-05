FROM node:alpine as builder
WORKDIR /usr/src/app
COPY . .
ARG buildmode=
RUN npm install $buildmode


FROM node:alpine
WORKDIR /app
RUN apk add -U tzdata && \
    cp /usr/share/zoneinfo/Europe/Berlin /etc/localtime
USER node
COPY --from=builder /usr/src/app /app
VOLUME /app/conf
CMD [ "npm", "start" ]

