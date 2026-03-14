FROM php:8.2-cli

WORKDIR /var/www/html

# System deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        unzip \
        libpng-dev \
        libjpeg-dev \
        libfreetype6-dev \
        libzip-dev \
        libonig-dev \
        libxml2-dev \
        curl \
        gnupg \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd mbstring exif pcntl bcmath zip \
    && pecl install mongodb \
    && docker-php-ext-enable mongodb \
    && rm -rf /var/lib/apt/lists/*

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Node.js (for Vite build)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# PHP deps
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress

# Node deps
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install; \
    elif [ -f yarn.lock ]; then npm install -g yarn && yarn install; \
    else npm install; fi

# App source
COPY . .

# Build assets if Vite exists
RUN if [ -f package.json ] && grep -q "\"build\":" package.json; then npm run build; fi

# Permissions
RUN chmod -R 775 storage bootstrap/cache

EXPOSE 10000

CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-10000} -t public"]
