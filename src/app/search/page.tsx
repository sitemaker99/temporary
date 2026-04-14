import Container from "@/components/container";
import React, { Suspense } from "react";
import SearchResults from "./search-results";
import Loading from "@/app/loading";

const page = () => {
  return (
    <Container>
      <Suspense fallback={<Loading />}>
        <SearchResults />
      </Suspense>
    </Container>
  );
};

export default page;
