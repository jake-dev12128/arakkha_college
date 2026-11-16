
import { useEffect, useState } from "react";

import {
  Badge,
  Box,
  Container,
  Flex,
  Heading,
  Image,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";

import { Link as RouterLink } from "react-router-dom";

import { truncateText } from "../../utils/truncateText.js";
import SectionTitle from "../common/SectionTitle.jsx";
import { newsService } from "../../services/news.service.js";

// ==================================================
// NEWS IMAGE
// ==================================================

function NewsImage({ item }) {
  const [imageFailed, setImageFailed] = useState(false);

  const imageUrl =
    item.coverImageDeliveryUrl || item.coverImage;

  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <Box
      position="relative"
      w="full"
      aspectRatio="16 / 9"
      overflow="hidden"
      bg="var(--public-surface-alt)"
      borderTopRadius="2xl"
    >
      {showImage ? (
        <Image
          src={imageUrl}
          alt={item.title || "ACC news image"}
          w="full"
          h="full"
          objectFit="cover"
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
          transition="transform 0.35s ease"
          _groupHover={{
            transform: "scale(1.04)",
          }}
        />
      ) : (
        <Flex
          w="full"
          h="full"
          align="center"
          justify="center"
          direction="column"
          gap="2"
          color="var(--public-muted)"
        >
          <Text
            fontSize="2xl"
            fontWeight="800"
            letterSpacing="2px"
            opacity={0.35}
          >
            ACC
          </Text>

          <Text fontSize="xs">
            News & Announcements
          </Text>
        </Flex>
      )}

      {item.isFeatured && (
        <Badge
          position="absolute"
          top="3"
          right="3"
          colorPalette="purple"
          borderRadius="full"
          px="3"
          py="1"
          boxShadow="sm"
        >
          Featured
        </Badge>
      )}
    </Box>
  );
}

// ==================================================
// NEWS CARD
// ==================================================

function NewsCard({ item }) {
  return (
    <Box
      as={RouterLink}
      to={`/news/${item._id}`}
      role="group"
      display="flex"
      flexDirection="column"
      h="full"
      overflow="hidden"
      borderWidth="1px"
      borderColor="var(--public-border)"
      borderRadius="2xl"
      bg="var(--public-surface)"
      color="var(--public-text)"
      textDecoration="none"
      transition="transform 0.2s ease, box-shadow 0.2s ease"
      _hover={{
        boxShadow: "lg",
        transform: "translateY(-3px)",
        textDecoration: "none",
      }}
      _focusVisible={{
        outline: "2px solid",
        outlineColor: "var(--public-accent)",
        outlineOffset: "3px",
      }}
    >
      <NewsImage item={item} />

      <Flex
        direction="column"
        flex="1"
        p={{ base: "5", md: "6" }}
      >
        <Flex gap="2" wrap="wrap">
          {item.category && (
            <Badge
              colorPalette="blue"
              borderRadius="full"
              px="3"
            >
              {item.category}
            </Badge>
          )}
        </Flex>

        <Heading
          size="md"
          mt="4"
          lineHeight="1.45"
          color="var(--public-text)"
          lineClamp={2}
        >
          {item.title}
        </Heading>

        {item.summary && (
          <Text
            mt="3"
            color="var(--public-muted)"
            lineHeight="1.7"
            lineClamp={3}
            fontSize="sm"
          >
            {truncateText(item.summary)}
          </Text>
        )}

        <Box flex="1" />

        <Flex
          mt="5"
          pt="4"
          align="center"
          justify="space-between"
          gap="3"
          borderTopWidth="1px"
          borderColor="var(--public-border)"
        >
          <Text
            fontSize="xs"
            color="var(--public-muted)"
          >
            {item.publishedAt &&
            !Number.isNaN(
              new Date(item.publishedAt).getTime()
            )
              ? new Date(
                  item.publishedAt
                ).toLocaleDateString()
              : ""}
          </Text>

          <Text
            fontSize="sm"
            fontWeight="600"
            color="var(--public-accent)"
          >
            Read more
          </Text>
        </Flex>
      </Flex>
    </Box>
  );
}

// ==================================================
// LATEST NEWS SECTION
// ==================================================

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
          setError(false);
        }
      } catch {
        if (active && !controller.signal.aborted) {
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
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
            py="8"
          >
            Loading news...
          </Text>
        )}

        {!loading && error && (
          <Text
            color="red.600"
            textAlign="center"
            py="8"
          >
            Unable to load latest news.
          </Text>
        )}

        {!loading &&
          !error &&
          news.length === 0 && (
            <Text
              color="var(--public-muted)"
              textAlign="center"
              py="8"
            >
              No news available yet.
            </Text>
          )}

        {!loading &&
          !error &&
          news.length > 0 && (
            <SimpleGrid
              columns={{ base: 1, md: 3 }}
              gap="6"
              alignItems="stretch"
            >
              {news.map((item) => (
                <NewsCard
                  key={item._id}
                  item={item}
                />
              ))}
            </SimpleGrid>
          )}
      </Container>
    </Box>
  );
}
