
import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Container,
  Flex,
  Heading,
  Image,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";

import PageHero from "../../components/common/PageHero.jsx";
import { newsService } from "../../services/news.service.js";

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
};

function NewsCard({ article }) {
  return (
    <Box
      as={RouterLink}
      to={`/news/${article._id}`}
      display="block"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="2xl"
      overflow="hidden"
      bg="white"
      textDecoration="none"
      transition="all 0.25s ease"
      _hover={{
        transform: "translateY(-5px)",
        shadow: "xl",
        borderColor: "blue.300",
      }}
      _focusVisible={{
        outline: "3px solid",
        outlineColor: "blue.500",
        outlineOffset: "3px",
      }}
    >
      <Box h="220px" bg="gray.100" overflow="hidden">
        {article.coverImage ? (
          <Image
            src={article.coverImage}
            alt={article.title}
            w="100%"
            h="100%"
            objectFit="cover"
            loading="lazy"
          />
        ) : (
          <Flex
            h="100%"
            justify="center"
            align="center"
            color="gray.400"
            fontWeight="bold"
            fontSize="xl"
          >
            ACC NEWS
          </Flex>
        )}
      </Box>

      <VStack align="stretch" gap={4} p={6}>
        <Flex gap={2} wrap="wrap">
          <Badge colorPalette="blue">
            {article.category}
          </Badge>

          {article.isFeatured && (
            <Badge colorPalette="purple">
              Featured
            </Badge>
          )}
        </Flex>

        <Heading size="md" color="gray.800" lineHeight="1.5">
          {article.title}
        </Heading>

        <Text
          color="gray.600"
          fontSize="sm"
          lineHeight="1.8"
          lineClamp={3}
        >
          {article.summary}
        </Text>

        <Text fontSize="xs" color="gray.500">
          {formatDate(article.publishedAt)}
        </Text>
      </VStack>
    </Box>
  );
}

export default function News() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadNews() {
      try {
        const data = await newsService.getPublic({
          signal: controller.signal,
        });

        if (active) {
          setArticles(data.news || []);
        }
      } catch (err) {
        if (active && !controller.signal.aborted) {
          setError("Unable to load news.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadNews();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const featured = articles.filter(
    (article) => article.isFeatured
  );

  const regular = articles.filter(
    (article) => !article.isFeatured
  );

  return (
    <>
      <PageHero
        title="News & Announcements"
        description="Latest news, announcements and important college updates."
      />

      <Container maxW="1280px" py={{ base: 10, md: 16 }}>
        {loading && (
          <Flex justify="center" py={16}>
            <Spinner size="lg" color="blue.600" />
          </Flex>
        )}

        {error && (
          <Text textAlign="center" color="red.600" py={10}>
            {error}
          </Text>
        )}

        {!loading && !error && articles.length === 0 && (
          <Text textAlign="center" color="gray.600" py={10}>
            No published news is currently available.
          </Text>
        )}

        {!loading && !error && (
          <VStack align="stretch" gap={12}>
            {featured.length > 0 && (
              <Box>
                <Heading size="xl" mb={6} color="gray.800">
                  Featured News
                </Heading>

                <SimpleGrid
                  columns={{ base: 1, md: 2, lg: 3 }}
                  gap={6}
                >
                  {featured.map((article) => (
                    <NewsCard
                      key={article._id}
                      article={article}
                    />
                  ))}
                </SimpleGrid>
              </Box>
            )}

            {regular.length > 0 && (
              <Box>
                <Heading size="xl" mb={6} color="gray.800">
                  Latest News
                </Heading>

                <SimpleGrid
                  columns={{ base: 1, md: 2, lg: 3 }}
                  gap={6}
                >
                  {regular.map((article) => (
                    <NewsCard
                      key={article._id}
                      article={article}
                    />
                  ))}
                </SimpleGrid>
              </Box>
            )}
          </VStack>
        )}
      </Container>
    </>
  );
}
