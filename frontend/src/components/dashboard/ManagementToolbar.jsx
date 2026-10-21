import { Flex, Input, NativeSelect } from "@chakra-ui/react";

export default function ManagementToolbar({
  search = "",
  onSearchChange,
  searchPlaceholder = "Search records...",
  filters = [],
}) {
  return (
    <Flex gap="2" align="center" wrap="wrap" width="100%">
      <Input
        aria-label={searchPlaceholder}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        maxW="260px"
        minW="180px"
        flex="1"
      />
      {filters.map((filter) => (
        <NativeSelect.Root key={filter.key} minW="150px" width="auto">
          <NativeSelect.Field
            aria-label={filter.label}
            value={filter.value}
            onChange={(event) => filter.onChange(event.target.value)}
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      ))}
    </Flex>
  );
}
