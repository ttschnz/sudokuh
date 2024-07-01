FROM node as build
ENV RUSTUP_HOME=/usr/local/rustup CARGO_HOME=/usr/local/cargo PATH=/usr/local/cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
RUN mkdir /app
WORKDIR /app 
COPY src /app/src
COPY www /app/www
COPY Cargo.toml /app/Cargo.toml
COPY Cargo.lock /app/Cargo.lock

WORKDIR www
RUN npm run build

FROM httpd:alpine3.20
COPY --from=build /app/www/dist /usr/local/apache2/htdocs/
