
import { useEffect, useState } from "react";

import {
  Box,
  Button,
  Grid,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";

import {
  FaUserGraduate,
  FaChalkboardUser,
  FaUserCheck,
  FaUserSlash,
} from "react-icons/fa6";

import { useOutletContext } from "react-router-dom";

import StatCard from "../../components/dashboard/StatCard.jsx";
import { dashboardService } from "../../services/dashboard.service.js";

export default function AdminOverview() {
  const { user } = useOutletContext();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const loadStats = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await dashboardService.getAdminStats(
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setStats(result);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        setStats(null);
        setError(
          err?.response?.data?.message ||
            "Unable to load dashboard statistics.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadStats();

    return () => controller.abort();
  }, [reloadKey]);

  const cards = [
    {
      title: "Total Students",
      value: stats?.totalStudents,
      icon: FaUserGraduate,
    },
    {
      title: "Total Teachers",
      value: stats?.totalTeachers,
      icon: FaChalkboardUser,
    },
    {
      title: "Active Users",
      value: stats?.activeUsers,
      icon: FaUserCheck,
    },
    {
      title: "Inactive Users",
      value: stats?.inactiveUsers,
      icon: FaUserSlash,
    },
  ];

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="2xl">
          {user.role === "super_admin"
            ? "Super Admin Dashboard"
            : "Admin Dashboard"}
        </Heading>

        <Text mt={2} color="fg.muted">
          Welcome back, {user.firstName}.
        </Text>
      </Box>

      {error && (
        <Box
          p={4}
          bg="red.subtle"
          borderRadius="lg"
          role="alert"
        >
          <Text color="red.fg">{error}</Text>

          <Button
            mt={3}
            size="sm"
            variant="outline"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Retry
          </Button>
        </Box>
      )}

      <Grid
        templateColumns={{
          base: "1fr",
          sm: "repeat(2, 1fr)",
          xl: "repeat(4, 1fr)",
        }}
        gap={4}
      >
        {cards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            loading={loading}
          />
        ))}
      </Grid>
    </VStack>
  );
}
