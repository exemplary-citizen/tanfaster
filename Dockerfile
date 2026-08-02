FROM denoland/deno:2.9.4 AS build
WORKDIR /app
COPY package.json deno.json deno.lock ./
RUN deno install --allow-scripts
COPY . .
ARG VITE_IMAGE_CDN_BASE
ENV VITE_IMAGE_CDN_BASE=$VITE_IMAGE_CDN_BASE
ENV NITRO_PRESET=deno_server
RUN deno task build

FROM denoland/deno:2.9.4
WORKDIR /app
COPY --from=build /app/.output .output
USER deno
ENV PORT=8080
EXPOSE 8080
CMD ["run", "--allow-net", "--allow-env", "--allow-read", ".output/server/index.mjs"]
