import { Box, Button, Container, Field, Grid, Heading, Input, Text, Textarea, VStack } from "@chakra-ui/react";
import PageHero from "../../components/common/PageHero.jsx";

export default function Contact() {
  return (
    <>
      <PageHero title="Contact Us" description="Get in touch with ACC Computer College." />
      <Container maxW="1100px" py="16">
        <Grid columns={{ base: 1, md: 2 }} gap="10">
          <Box>
            <Heading size="lg">Contact Information</Heading>
            <Text mt="5" color="gray.600" lineHeight="2">
              Arakkha<br />
              arakkhacomputercollege@acc.com<br />
              +95 9 000 000 000
            </Text>
          </Box>

          <Box borderWidth="1px" borderRadius="2xl" p="7" bg="white">
            <VStack align="stretch" gap="5">
              <Field.Root>
                <Field.Label>Name</Field.Label>
                <Input placeholder="Your name" />
              </Field.Root>
              <Field.Root>
                <Field.Label>Email</Field.Label>
                <Input type="email" placeholder="you@example.com" />
              </Field.Root>
              <Field.Root>
                <Field.Label>Message</Field.Label>
                <Textarea placeholder="Your message" minH="140px" />
              </Field.Root>
              <Button colorPalette="blue">Send Message</Button>
            </VStack>
          </Box>
        </Grid>
      </Container>
    </>
  );
}
