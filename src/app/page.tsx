"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export default function Home() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        px: 2,
      }}
    >
      <Typography variant="h3" component="h1">
        webportal
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ textAlign: "center" }}
      >
        リンクメモ・画像・リッチテキストを自由に配置できるメモボードです。
      </Typography>
      <Button component={Link} href="/portals" variant="contained" size="large">
        メモボード一覧を開く
      </Button>
    </Box>
  );
}
