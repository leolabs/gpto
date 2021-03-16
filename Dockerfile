FROM hayd/alpine-deno:1.8.1

RUN apk add exiftool file

WORKDIR /app
USER deno

ADD mod.ts .
ADD util util
ADD types types
RUN deno cache mod.ts

ENTRYPOINT ["deno", "run", "--unstable", "--allow-read", "--allow-write", "--allow-run", "mod.ts"]