import { Box, styled, Typography } from "@mui/material";
import { Link, LinkProps } from "react-router-dom";
import { colors } from "../../../helpers/theme/colors";

interface StyledLinkWrapperProps {
  active: boolean;
}

export const StyledLinkWrapper = styled(
  (
    { active, ...props }: LinkProps & StyledLinkWrapperProps // eslint-disable-line @typescript-eslint/no-unused-vars
  ) => <Link {...props} />
)<StyledLinkWrapperProps>(
  ({ active }) => `
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-left: 14px;
  border-radius: 20px 0px 0px 20px;
  width: 100%;
  margin: 12px 0;
  padding: 7px 0 7px 16px;
  text-decoration: none;
  color: ${active ? "#17003E" : "#fff"};
  cursor: pointer;
  ${active ? "background-color: #fff;" : ""}

  &:hover {
    color: #B17DFF;
  };

  &:hover img {
    color: #B17DFF;
  }

  &:first-of-type {
    margin-top: 0;
  };

  &:last-of-type {
    margin-bottom: 0;
  };
`
);

export const StyledLeftColumn = styled(Box)({
  display: "flex",
  alignItems: "center",
});

export const StyledTypography = styled(Typography)({
  fontSize: "14px",
  lineHeight: "120%",
  marginLeft: "14px",
});

interface StyledArrowWrapperProps {
  hover: boolean;
}

export const StyledArrowWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== "hover",
})<StyledArrowWrapperProps>(({ hover, theme }) => ({
  width: 16,
  height: 16,
  borderRadius: "50%",
  marginRight: "30px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: hover
    ? theme.palette.primary.dark
    : theme.palette.primary.contrastText,
  "& svg": {
    fill: hover ? colors.primary.violet[600] : theme.palette.common.black,
  },
}));
