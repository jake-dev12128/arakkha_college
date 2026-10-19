
import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Container,
  Flex,
  Heading,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { truncateText } from "../../utils/truncateText.js";
import SectionTitle from "../common/SectionTitle.jsx";
import { newsService } from "../../services/news.service.js";

export default function LatestNews() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function fetchNews() {
      try {
        const data = await newsService.getPublic({
          signal: controller.signal,
        });

        if (active) {
          setNews((data.news || []).slice(0, 3));
        }
      } catch {
        if (active && !controller.signal.aborted) {
          setError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchNews();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return (
    <Box
      py={{ base: "14", md: "20" }}
      bg="var(--public-bg)"
      color="var(--public-text)"
    >
      <Container maxW="1280px">
        <SectionTitle
          eyebrow="Stay informed"
          title="Latest News"
          description="Announcements, academic updates and important information from ACC."
        />

        {loading && (
          <Text
            color="var(--public-muted)"
            textAlign="center"
            py={8}
          >
            Loading news...
          </Text>
        )}

        {error && (
          <Text color="red.600" textAlign="center" py={8}>
            Unable to load latest news.
          </Text>
        )}

        {!loading && !error && news.length === 0 && (
          <Text
            color="var(--public-muted)"
            textAlign="center"
            py={8}
          >
            No news available yet.
          </Text>
        )}

        <SimpleGrid
          columns={{ base: 1, md: 3 }}
          gap="6"
        >
          {news.map((item) => (
            <Box
              key={item._id}
              as={RouterLink}
              to={`/news/${item._id}`}
              display="block"
              borderWidth="1px"
              borderColor="var(--public-border)"
              borderRadius="2xl"
              p="7"
              bg="var(--public-surface)"
              color="var(--public-text)"
              textDecoration="none"
              transition="all .2s"
              _hover={{
                boxShadow: "lg",
                transform: "translateY(-3px)",
              }}
            >
              <Flex gap={2} wrap="wrap">
                <Badge colorPalette="blue">
                  {item.category}
                </Badge>

                {item.isFeatured && (
                  <Badge colorPalette="purple">
                    Featured
                  </Badge>
                )}
              </Flex>

              <Heading
                size="md"
                mt="5"
                lineHeight="1.4"
                color="var(--public-text)"
              >
                {item.title}
              </Heading>

              <Text
                mt="3"
                color="var(--public-muted)"
                lineHeight="1.7"
                lineClamp={3}
              >
                {truncateText(item.summary)}
              </Text>

              <Text
                mt="5"
                fontSize="sm"
                color="var(--public-muted)"
              >
                {item.publishedAt
                  ? new Date(
                      item.publishedAt
                    ).toLocaleDateString()
                  : ""}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
