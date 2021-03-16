FROM hayd/alpine-deno:1.8.1

RUN apk add exiftool

WORKDIR /app
USER deno

ADD . .
RUN deno cache mod.ts

CMD ["run", "--allow-read", "--allow-write", "--allow-run", "mod.ts"]