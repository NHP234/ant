package com.example.demo.config;

import com.example.demo.dto.response.BookResponse;
import com.example.demo.dto.response.CategoryResponse;
import com.example.demo.dto.response.DashboardStatsResponse;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Configuration
@EnableCaching
@SuppressWarnings("removal")
@Slf4j
public class CacheConfig implements CachingConfigurer {

    private static final String CACHE_KEY_PREFIX = "library:v2:";

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        ObjectMapper mapper = cacheObjectMapper();
        RedisCacheConfiguration defaultConfig = cacheConfiguration(
                new Jackson2JsonRedisSerializer<>(mapper, Object.class),
                Duration.ofMinutes(10)
        );

        Map<String, RedisCacheConfiguration> cacheConfigs = Map.of(
                "categories", cacheConfiguration(categoryListSerializer(mapper), Duration.ofHours(24)),
                "book", cacheConfiguration(new Jackson2JsonRedisSerializer<>(mapper, BookResponse.class), Duration.ofMinutes(30)),
                "dashboardStats", cacheConfiguration(new Jackson2JsonRedisSerializer<>(mapper, DashboardStatsResponse.class), Duration.ofMinutes(5))
        );

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }

    private ObjectMapper cacheObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }

    private RedisSerializer<List<CategoryResponse>> categoryListSerializer(ObjectMapper mapper) {
        JavaType categoryListType = mapper.getTypeFactory()
                .constructCollectionType(List.class, CategoryResponse.class);
        return new Jackson2JsonRedisSerializer<>(mapper, categoryListType);
    }

    private RedisCacheConfiguration cacheConfiguration(RedisSerializer<?> valueSerializer, Duration ttl) {
        return RedisCacheConfiguration.defaultCacheConfig()
                .computePrefixWith(cacheName -> CACHE_KEY_PREFIX + cacheName + "::")
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(valueSerializer))
                .entryTtl(ttl)
                .disableCachingNullValues();
    }

    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Cache get failed for cache '{}' key '{}', evicting and falling back to source",
                        cache.getName(), key, exception);
                try {
                    cache.evictIfPresent(key);
                } catch (RuntimeException evictException) {
                    log.warn("Cache evict after get failure also failed for cache '{}' key '{}'",
                            cache.getName(), key, evictException);
                }
            }

            @Override
            public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
                log.warn("Cache put failed for cache '{}' key '{}', continuing without cache",
                        cache.getName(), key, exception);
            }

            @Override
            public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Cache evict failed for cache '{}' key '{}'", cache.getName(), key, exception);
            }

            @Override
            public void handleCacheClearError(RuntimeException exception, Cache cache) {
                log.warn("Cache clear failed for cache '{}'", cache.getName(), exception);
            }
        };
    }
}
