"use client";

/**
 * Registrerer GSAP-plugins ét sted, så alle komponenter kan importere herfra.
 */
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, Flip);
  gsap.defaults({ ease: "expo.out", duration: 1.2 });
}

export { Flip, gsap, ScrollTrigger, SplitText, useGSAP };
