
import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Image,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  Link as RouterLink,
  useParams,
} from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import DOMPurify from "dompurify";

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

export default function NewsDetail() {
  const { id } = useParams();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError("");
    setArticle(null);

    async function loadArticle() {
      try {
        const data = await newsService.getPublicById(
          id,
          { signal: controller.signal }
        );

        if (active) {
          setArticle(data.news || null);
        }
      } catch (err) {
        if (active && !controller.signal.aborted) {
          setError(
            err?.response?.status === 404
              ? "This news article is not available."
              : "Unable to load news details."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadArticle();

    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);

  return (
    <>
      <PageHero
        title="News Details"
        description="News and announcements from ACC Computer College."
      />

      <Box
        bg="var(--public-bg)"
        color="var(--public-text)"
        minH="65vh"
        py={{ base: 10, md: 16 }}
      >
        <Container maxW="950px">
          <Button
            as={RouterLink}
            to="/news"
            variant="ghost"
            colorPalette="blue"
            mb={8}
          >
            <FaArrowLeft />
            Back to News
          </Button>

          {loading && (
            <Flex justify="center" py={16}>
              <Spinner
                size="lg"
                color="var(--public-accent)"
              />
            </Flex>
          )}

          {!loading && (error || !article) && (
            <Box
              bg="var(--public-surface)"
              color="var(--public-text)"
              p={10}
              borderRadius="2xl"
              textAlign="center"
            >
              <Heading
                size="lg"
                color="var(--public-text)"
              >
                News Unavailable
              </Heading>

              <Text
                mt={3}
                color="var(--public-muted)"
              >
                {error || "News article not found."}
              </Text>
            </Box>
          )}

          {!loading && article && (
            <Box
              bg="var(--public-surface)"
              color="var(--public-text)"
              borderWidth="1px"
              borderColor="var(--public-border)"
              borderRadius="2xl"
              overflow="hidden"
              shadow="sm"
            >
              {article.coverImage && (
                <Image
                  src={article.coverImage}
                  alt={article.title}
                  w="100%"
                  maxH="450px"
                  objectFit="cover"
                />
              )}

              <VStack
                align="stretch"
                gap={6}
                p={{ base: 6, md: 10 }}
              >
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

                <Heading
                  size={{ base: "xl", md: "2xl" }}
                  color="var(--public-text)"
                  lineHeight="1.4"
                >
                  {article.title}
                </Heading>

                <Text
                  fontSize="sm"
                  color="var(--public-muted)"
                >
                  Published: {formatDate(article.publishedAt)}
                </Text>

                <Text
                  fontSize="lg"
                  color="var(--public-text)"
                  fontWeight="medium"
                  lineHeight="1.9"
                  whiteSpace="pre-wrap"
                >
                  {article.summary}
                </Text>

                <Box
                  borderTopWidth="1px"
                  borderColor="var(--public-border)"
                  pt={7}
                  color="var(--public-text)"
                  lineHeight="1.9"
                  css={{
                    "& p": {
                      marginBottom: "1rem",
                    },
                    "& h1, & h2, & h3": {
                      fontWeight: "bold",
                      marginTop: "1.5rem",
                      marginBottom: "0.75rem",
                    },
                    "& ul": {
                      listStyleType: "disc",
                      paddingLeft: "1.5rem",
                    },
                    "& ol": {
                      listStyleType: "decimal",
                      paddingLeft: "1.5rem",
                    },
                    "& li": {
                      marginBottom: "0.4rem",
                    },
                    "& blockquote": {
                      borderLeft: "4px solid var(--public-accent)",
                      paddingLeft: "1rem",
                      fontStyle: "italic",
                    },
                    "& a": {
                      color: "var(--public-accent)",
                      textDecoration: "underline",
                    },
                  }}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(
                      article.content || ""
                    ),
                  }}
                />
              </VStack>
            </Box>
          )}
        </Container>
      </Box>
    </>
  );
}
