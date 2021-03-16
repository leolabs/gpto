FROM hayd/alpine-deno:1.8.1

WORKDIR /app
USER deno

RUN apk add exiftool

ADD . .
RUN deno cache mod.ts

CMD ["run", "--allow-read", "--allow-write", "--allow-run", "mod.ts"]