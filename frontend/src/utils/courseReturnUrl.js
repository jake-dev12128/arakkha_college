const COURSE_URL_PATTERN =
  /^\/academic\/courses\/[a-f0-9]{24}$/i;

export const getSafeReturnUrl = (search = "") => {
  const params = new URLSearchParams(search);
  const requested = params.get("returnTo");

  if (
    requested &&
    COURSE_URL_PATTERN.test(requested)
  ) {
    return requested;
  }

  return "/acc/auth/dashboard";
};

export const buildCourseLoginUrl = (courseUrl) => {
  const params = new URLSearchParams({
    returnTo: courseUrl,
  });

  return `/acc/auth/login?${params.toString()}`;
};