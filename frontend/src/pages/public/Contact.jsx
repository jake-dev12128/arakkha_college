
import {
  Box,
  Button,
  Container,
  Field,
  Grid,
  Heading,
  Input,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";

import PageHero from "../../components/common/PageHero.jsx";

export default function Contact() {
  return (
    <>
      <PageHero
        title="Contact Us"
        description="Get in touch with ACC Computer College."
      />

      <Container
        maxW="1100px"
        py="16"
        color="var(--public-text)"
      >
        <Grid
          columns={{ base: 1, md: 2 }}
          gap="10"
        >
          <Box>
            <Heading
              size="lg"
              color="var(--public-text)"
            >
              Contact Information
            </Heading>

            <Text
              mt="5"
              color="var(--public-muted)"
              lineHeight="2"
            >
              Arakkha
              {"\n"}
              arakkhacomputercollege@acc.com
              {"\n"}
              +95 9 000 000 000
            </Text>
          </Box>

          <Box
            borderWidth="1px"
            borderColor="var(--public-border)"
            borderRadius="2xl"
            p="7"
            bg="var(--public-surface)"
            color="var(--public-text)"
          >
            <VStack
              align="stretch"
              gap="5"
            >
              <Field.Root>
                <Field.Label
                  color="var(--public-text)"
                >
                  Name
                </Field.Label>

                <Input
                  placeholder="Your name"
                  bg="var(--public-surface-alt)"
                  color="var(--public-text)"
                  borderColor="var(--public-border)"
                  _placeholder={{
                    color: "var(--public-muted)",
                  }}
                  _focusVisible={{
                    borderColor: "var(--public-accent)",
                    outlineColor: "var(--public-accent)",
                  }}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label
                  color="var(--public-text)"
                >
                  Email
                </Field.Label>

                <Input
                  type="email"
                  placeholder="you@example.com"
                  bg="var(--public-surface-alt)"
                  color="var(--public-text)"
                  borderColor="var(--public-border)"
                  _placeholder={{
                    color: "var(--public-muted)",
                  }}
                  _focusVisible={{
                    borderColor: "var(--public-accent)",
                    outlineColor: "var(--public-accent)",
                  }}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label
                  color="var(--public-text)"
                >
                  Message
                </Field.Label>

                <Textarea
                  placeholder="Your message"
                  minH="140px"
                  bg="var(--public-surface-alt)"
                  color="var(--public-text)"
                  borderColor="var(--public-border)"
                  _placeholder={{
                    color: "var(--public-muted)",
                  }}
                  _focusVisible={{
                    borderColor: "var(--public-accent)",
                    outlineColor: "var(--public-accent)",
                  }}
                />
              </Field.Root>

              <Button colorPalette="blue">
                Send Message
              </Button>
            </VStack>
          </Box>
        </Grid>
      </Container>
    </>
  );
}
