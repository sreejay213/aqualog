import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const TODAY_STR = "2026-05-23";
const FOUR_WEEKS_AGO = "2026-04-25";

const LIVESTOCK = {
  "5G Betta Tank": [
    { name: "Galaxy Male Betta + 1 Nirite Snail", qty: 1, days: 475 },
  ],
  "10G GloFish Tank": [
    { name: "GloFish Danio (Red, Green, Pink)", qty: 3, days: 420 },
    { name: "GloFish Tetra (Pink, Orange)", qty: 2, days: 420 },
  ],
  "20G Gold Fish Tank": [
    { name: "Gold Fish (Comet)", qty: 1, days: 454 },
    { name: "Gold Fish (Oranda)", qty: 1, days: 454 },
    { name: "Gold Fish (Oranda Fan Tail)", qty: 1, days: 329 },
  ],
  "40G Community Tank": [
    { name: "Angel Fish", qty: 1, days: 768 },
    { name: "Coridora", qty: 1, days: 768 },
    { name: "Algae Eater", qty: 1, days: 454 },
    { name: "Glow Light Tetra", qty: 1, days: 370 },
    { name: "Neon Tetra", qty: 4, days: 370 },
    { name: "Sunburst Platties", qty: 2, days: 368 },
    { name: "Albino Shark", qty: 1, days: 329 },
    { name: "Juli Coridora", qty: 2, days: 329 },
    { name: "Black Tetra", qty: 1, days: 329 },
    { name: "Red Eye Tetra", qty: 4, days: 329 },
    { name: "Molly", qty: 1, days: 329 },
    { name: "Stem Plants", qty: 1, days: 91 },
  ],
  "IM20 Reef Tank": [
    { name: "Astrea Snail", qty: 5, days: 182 },
    { name: "Red Leg Hermit Crab", qty: 3, days: 182 },
    { name: "Pajama Cardinal", qty: 1, days: 119 },
    { name: "Ocellaris Clownfish", qty: 1, days: 119 },
    { name: "Yellow Watchman Goby", qty: 1, days: 119 },
    { name: "Valentini Saddled Puffer", qty: 1, days: 62 },
    { name: "Corals (Zoa, Hammer, Mushroom, Acans…)", qty: 12, days: 28 },
  ],
  "RS250 Reef Tank": [
    { name: "Ocellaris Clownfish", qty: 1, days: 752 },
    { name: "Pistol Shrimp", qty: 1, days: 742 },
    { name: "Hawaiian Yellow Tang", qty: 1, days: 722 },
    { name: "Astrea Snail", qty: 2, days: 182 },
    { name: "Powder Blue Tang", qty: 1, days: 119 },
    { name: "Ocellaris Clownfish (new)", qty: 1, days: 119 },
    { name: "Pajama Cardinal", qty: 1, days: 119 },
    { name: "Damselfish - Talbot", qty: 1, days: 62 },
    { name: "Aiptasia-Eating Filefish", qty: 1, days: 62 },
    { name: "Inverts (Mexican Crab, Trochus Snails)", qty: 5, days: 28 },
  ],
};

const TANKS = [
  { id: "5G Betta Tank",      type: "freshwater", size: "5 Gal",  setup: "2024-04-07" },
  { id: "10G GloFish Tank",   type: "freshwater", size: "10 Gal", setup: "2025-02-02" },
  { id: "20G Gold Fish Tank", type: "freshwater", size: "20 Gal", setup: "2025-02-20" },
  { id: "40G Community Tank", type: "freshwater", size: "40 Gal", setup: "2025-04-01" },
  { id: "IM20 Reef Tank",     type: "saltwater",  size: "20 Gal", setup: "2024-08-24" },
  { id: "RS250 Reef Tank",    type: "saltwater",  size: "65 Gal", setup: "2024-05-01" },
];

const PARAMS_SEED = [
  { date:"2025-04-11", tank:"5G Betta Tank",      nitrate:10,  ph:7.50, ammonia:0 },
  { date:"2025-04-11", tank:"10G GloFish Tank",   nitrate:10,  ph:7.60 },
  { date:"2025-04-11", tank:"20G Gold Fish Tank", nitrate:0,   ph:7.50 },
  { date:"2025-04-11", tank:"40G Community Tank", nitrate:10,  ph:7.50 },
  { date:"2025-04-11", tank:"RS250 Reef Tank",    nitrate:0,   ph:7.50 },
  { date:"2025-04-18", tank:"5G Betta Tank",      nitrate:5,   ph:7.50, ammonia:0 },
  { date:"2025-04-18", tank:"10G GloFish Tank",   nitrate:10,  ph:7.50 },
  { date:"2025-04-18", tank:"20G Gold Fish Tank", nitrate:5,   ph:7.50 },
  { date:"2025-04-18", tank:"40G Community Tank", nitrate:10,  ph:7.50 },
  { date:"2025-04-18", tank:"RS250 Reef Tank",    nitrate:10,  phosphate:0.35, salinity:34.6, ph:8.03, alkalinity:9.3, calcium:480, magnesium:1410 },
  { date:"2025-04-25", tank:"5G Betta Tank",      nitrate:5,   ph:7.50 },
  { date:"2025-04-25", tank:"10G GloFish Tank",   nitrate:5,   ph:7.50 },
  { date:"2025-04-25", tank:"20G Gold Fish Tank", nitrate:5,   ph:7.50 },
  { date:"2025-04-25", tank:"40G Community Tank", nitrate:10,  ph:7.50 },
  { date:"2025-04-25", tank:"RS250 Reef Tank",    nitrate:10,  phosphate:0.28, salinity:34.4, ph:8.03 },
  { date:"2025-05-02", tank:"5G Betta Tank",      nitrate:5,   ph:7.50, ammonia:0 },
  { date:"2025-05-02", tank:"10G GloFish Tank",   nitrate:15,  ph:7.50 },
  { date:"2025-05-02", tank:"20G Gold Fish Tank", nitrate:5,   ph:7.50 },
  { date:"2025-05-02", tank:"40G Community Tank", nitrate:15,  ph:7.50 },
  { date:"2025-05-03", tank:"RS250 Reef Tank",    nitrate:15,  phosphate:0.24, salinity:33.7, ph:8.02 },
  { date:"2025-05-09", tank:"5G Betta Tank",      nitrate:0 },
  { date:"2025-05-09", tank:"10G GloFish Tank",   nitrate:10 },
  { date:"2025-05-09", tank:"20G Gold Fish Tank", nitrate:0 },
  { date:"2025-05-09", tank:"40G Community Tank", nitrate:10 },
  { date:"2025-05-16", tank:"5G Betta Tank",      nitrate:10 },
  { date:"2025-05-16", tank:"10G GloFish Tank",   nitrate:20 },
  { date:"2025-05-16", tank:"20G Gold Fish Tank", nitrate:0 },
  { date:"2025-05-16", tank:"40G Community Tank", nitrate:0 },
  { date:"2025-05-31", tank:"RS250 Reef Tank",    nitrate:20,  phosphate:0.04 },
  { date:"2025-06-07", tank:"RS250 Reef Tank",    nitrate:20,  phosphate:0.06 },
  { date:"2025-06-14", tank:"RS250 Reef Tank",    nitrate:40,  phosphate:0.09 },
  { date:"2025-08-16", tank:"RS250 Reef Tank",    nitrate:20,  phosphate:0.12, salinity:34.1, ph:8.10, alkalinity:10.0, calcium:430, magnesium:1350 },
  { date:"2026-01-10", tank:"IM20 Reef Tank",     nitrate:20,  phosphate:0.23, salinity:33.8, ph:8.10 },
  { date:"2026-01-10", tank:"RS250 Reef Tank",    nitrate:10,  phosphate:0.20, salinity:34.1, ph:8.00 },
  { date:"2026-01-17", tank:"IM20 Reef Tank",     nitrate:10,  phosphate:0.20, salinity:33.4, ph:8.10 },
  { date:"2026-01-17", tank:"RS250 Reef Tank",    nitrate:10,  phosphate:0.17, salinity:34.1, ph:8.00 },
  { date:"2026-01-23", tank:"40G Community Tank", nitrate:10 },
  { date:"2026-01-23", tank:"20G Gold Fish Tank", nitrate:25 },
  { date:"2026-01-23", tank:"IM20 Reef Tank",     nitrate:20,  phosphate:0.11, salinity:33.7, ph:8.10 },
  { date:"2026-01-23", tank:"RS250 Reef Tank",    nitrate:20,  phosphate:0.00, salinity:34.4, ph:8.50 },
  { date:"2026-01-29", tank:"40G Community Tank", nitrate:0,   ph:8.00, alkalinity:120 },
  { date:"2026-01-29", tank:"20G Gold Fish Tank", nitrate:25,  ph:8.00, alkalinity:120 },
  { date:"2026-01-29", tank:"10G GloFish Tank",   nitrate:10,  ph:8.00, alkalinity:120 },
  { date:"2026-01-29", tank:"5G Betta Tank",      nitrate:0,   ph:8.00, alkalinity:120 },
  { date:"2026-01-29", tank:"IM20 Reef Tank",     nitrate:10,  phosphate:0.13, salinity:34.1, ph:8.20, alkalinity:7.6, calcium:10, magnesium:1500 },
  { date:"2026-01-29", tank:"RS250 Reef Tank",    nitrate:20,  phosphate:0.07, salinity:34.0, ph:8.40, alkalinity:10.4, calcium:150, magnesium:1410 },
  { date:"2026-02-06", tank:"40G Community Tank", nitrate:5,   ph:7.80, alkalinity:120 },
  { date:"2026-02-06", tank:"20G Gold Fish Tank", nitrate:25,  ph:8.00, alkalinity:120 },
  { date:"2026-02-06", tank:"10G GloFish Tank",   nitrate:0,   ph:7.80, alkalinity:100 },
  { date:"2026-02-06", tank:"5G Betta Tank",      nitrate:0,   ph:7.80, alkalinity:100 },
  { date:"2026-02-07", tank:"IM20 Reef Tank",     nitrate:7.5, phosphate:0.18, alkalinity:10.1, calcium:440, magnesium:1700 },
  { date:"2026-02-07", tank:"RS250 Reef Tank",    nitrate:0,   phosphate:0.06, ph:8.50, alkalinity:10.4, calcium:420, magnesium:1700 },
  { date:"2026-02-12", tank:"40G Community Tank", nitrate:5 },
  { date:"2026-02-12", tank:"20G Gold Fish Tank", nitrate:25 },
  { date:"2026-02-12", tank:"RS250 Reef Tank",    nitrate:15,  phosphate:0.07, salinity:31.0, ph:8.20 },
  { date:"2026-02-12", tank:"IM20 Reef Tank",     nitrate:20,  phosphate:0.12, salinity:31.5, ph:8.10 },
  { date:"2026-02-20", tank:"5G Betta Tank",      nitrate:10,  ph:7.80, alkalinity:100 },
  { date:"2026-02-20", tank:"40G Community Tank", nitrate:10,  ph:7.80, alkalinity:100 },
  { date:"2026-02-20", tank:"10G GloFish Tank",   nitrate:10,  ph:7.80, alkalinity:100 },
  { date:"2026-02-20", tank:"20G Gold Fish Tank", nitrate:20,  ph:7.80, alkalinity:100 },
  { date:"2026-02-28", tank:"40G Community Tank", nitrate:0,   phosphate:1.50, ph:7.80 },
  { date:"2026-02-28", tank:"20G Gold Fish Tank", nitrate:5,   phosphate:1.00, ph:7.80 },
  { date:"2026-02-28", tank:"RS250 Reef Tank",    nitrate:0,   phosphate:0.04, ph:8.30 },
  { date:"2026-02-28", tank:"IM20 Reef Tank",     nitrate:5,   ph:8.20 },
  { date:"2026-03-19", tank:"RS250 Reef Tank",    nitrate:20,  phosphate:0.12 },
  { date:"2026-03-19", tank:"IM20 Reef Tank",     nitrate:20,  phosphate:0.14 },
  { date:"2026-03-21", tank:"40G Community Tank", nitrate:15,  ph:7.80 },
  { date:"2026-03-21", tank:"20G Gold Fish Tank", nitrate:15,  ph:7.80 },
  { date:"2026-03-21", tank:"RS250 Reef Tank",    nitrate:10,  phosphate:0.05, ph:8.40 },
  { date:"2026-03-21", tank:"IM20 Reef Tank",     nitrate:5,   phosphate:0.05, ph:8.30 },
  { date:"2026-03-27", tank:"IM20 Reef Tank",     nitrate:15,  phosphate:0.12 },
  { date:"2026-03-27", tank:"RS250 Reef Tank",    nitrate:10,  phosphate:0.00 },
  { date:"2026-03-27", tank:"20G Gold Fish Tank", nitrate:10 },
  { date:"2026-03-27", tank:"40G Community Tank", nitrate:10 },
  { date:"2026-04-03", tank:"40G Community Tank", nitrate:5 },
  { date:"2026-04-03", tank:"20G Gold Fish Tank", nitrate:10 },
  { date:"2026-04-03", tank:"5G Betta Tank",      nitrate:0 },
  { date:"2026-04-03", tank:"10G GloFish Tank",   nitrate:5 },
  { date:"2026-04-03", tank:"IM20 Reef Tank",     nitrate:10,  phosphate:0.10 },
  { date:"2026-04-03", tank:"RS250 Reef Tank",    nitrate:20,  phosphate:0.03 },
  { date:"2026-04-10", tank:"IM20 Reef Tank",     nitrate:20,  phosphate:0.13, alkalinity:6.2 },
  { date:"2026-04-10", tank:"RS250 Reef Tank",    nitrate:20,  phosphate:0.00, alkalinity:9.5 },
  { date:"2026-04-17", tank:"RS250 Reef Tank",    nitrate:20,  phosphate:0.00 },
  { date:"2026-04-17", tank:"IM20 Reef Tank",     nitrate:5,   phosphate:0.13 },
  { date:"2026-04-23", tank:"IM20 Reef Tank",     nitrate:10,  phosphate:0.00 },
  { date:"2026-04-23", tank:"RS250 Reef Tank",    nitrate:10,  phosphate:0.00 },
  { date:"2026-04-30", tank:"IM20 Reef Tank",     nitrate:10,  phosphate:0.04, calcium:430, magnesium:1520 },
  { date:"2026-04-30", tank:"RS250 Reef Tank",    nitrate:10,  phosphate:0.02, calcium:400, magnesium:1600 },
  { date:"2026-05-21", tank:"IM20 Reef Tank",     nitrate:10,  phosphate:0.14 },
  { date:"2026-05-21", tank:"RS250 Reef Tank",    nitrate:10,  phosphate:0.06 },
];

const DIARY_SEED = [
  { date:"2026-04-10", tank:"5G Betta Tank",      category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-10", tank:"10G GloFish Tank",   category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-10", tank:"20G Gold Fish Tank", category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-10", tank:"40G Community Tank", category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-11", tank:"IM20 Reef Tank",     category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-11", tank:"RS250 Reef Tank",    category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-17", tank:"5G Betta Tank",      category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-17", tank:"10G GloFish Tank",   category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-17", tank:"20G Gold Fish Tank", category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-17", tank:"40G Community Tank", category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-19", tank:"IM20 Reef Tank",     category:"Maintenance",  notes:"10% Water Changed. Changed back to Instant Ocean Purple salt. Added Phosphate remover." },
  { date:"2026-04-19", tank:"RS250 Reef Tank",    category:"Maintenance",  notes:"10% Water Changed. Scraped back wall. Replaced Polyfill. Brushed rocks. Adjusted wavemaker." },
  { date:"2026-04-24", tank:"5G Betta Tank",      category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-24", tank:"10G GloFish Tank",   category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-24", tank:"20G Gold Fish Tank", category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-24", tank:"40G Community Tank", category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-25", tank:"IM20 Reef Tank",     category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-25", tank:"RS250 Reef Tank",    category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-26", tank:"IM20 Reef Tank",     category:"Maintenance",  notes:"Added VCA Filter, replacing Filter socks." },
  { date:"2026-04-26", tank:"RS250 Reef Tank",    category:"Maintenance",  notes:"Added VCA Filter, replacing Filter polyfils." },
  { date:"2026-04-26", tank:"IM20 Reef Tank",     category:"LiveStock",    notes:"Added new Corals, moved to IM20 tank on 5/1." },
  { date:"2026-04-30", tank:"5G Betta Tank",      category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-30", tank:"10G GloFish Tank",   category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-30", tank:"20G Gold Fish Tank", category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-04-30", tank:"40G Community Tank", category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-05-01", tank:"IM20 Reef Tank",     category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-05-01", tank:"RS250 Reef Tank",    category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-05-16", tank:"5G Betta Tank",      category:"Maintenance",  notes:"10% Water Changed and Filters Changed." },
  { date:"2026-05-16", tank:"10G GloFish Tank",   category:"Maintenance",  notes:"10% Water Changed and Filters Changed." },
  { date:"2026-05-16", tank:"20G Gold Fish Tank", category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-05-16", tank:"40G Community Tank", category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-05-22", tank:"IM20 Reef Tank",     category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-05-22", tank:"RS250 Reef Tank",    category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-05-22", tank:"5G Betta Tank",      category:"Maintenance",  notes:"10% Water Changed and Filters Changed." },
  { date:"2026-05-22", tank:"10G GloFish Tank",   category:"Maintenance",  notes:"10% Water Changed and Filters Changed." },
  { date:"2026-05-22", tank:"20G Gold Fish Tank", category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-05-22", tank:"40G Community Tank", category:"Maintenance",  notes:"10% Water Changed and Filters rinsed." },
  // Historical entries
  { date:"2026-03-20", tank:"RS250 Reef Tank",    category:"Water Change", notes:"10% Water Changed. Sand bed adjusted, Arch fell down." },
  { date:"2026-03-20", tank:"IM20 Reef Tank",     category:"Water Change", notes:"10% Water Changed. Removed water from sump." },
  { date:"2026-03-13", tank:"RS250 Reef Tank",    category:"Water Change", notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-03-07", tank:"RS250 Reef Tank",    category:"Water Change", notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-02-28", tank:"RS250 Reef Tank",    category:"Water Change", notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-02-20", tank:"RS250 Reef Tank",    category:"Water Change", notes:"10% Water Changed and Filters rinsed. Added AptasiaX." },
  { date:"2026-02-14", tank:"40G Community Tank", category:"Water Change", notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-02-13", tank:"RS250 Reef Tank",    category:"Water Change", notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-02-13", tank:"IM20 Reef Tank",     category:"Water Change", notes:"10% Water Changed. Removed water from sump." },
  { date:"2026-01-30", tank:"RS250 Reef Tank",    category:"Water Change", notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-01-30", tank:"IM20 Reef Tank",     category:"Water Change", notes:"10% Water Changed and Filters rinsed." },
  { date:"2026-01-23", tank:"RS250 Reef Tank",    category:"Dosage",       notes:"Microbactor 10ml, Kick Ich Pro 120ml." },
  { date:"2026-01-23", tank:"IM20 Reef Tank",     category:"Dosage",       notes:"Microbactor 5ml, Phosphate E 5ml." },
  { date:"2026-01-20", tank:"RS250 Reef Tank",    category:"Dosage",       notes:"Kick Ich Pro 120ml, Phosguard 100ml." },
  { date:"2026-01-16", tank:"RS250 Reef Tank",    category:"Water Change", notes:"10% Water Changed." },
  { date:"2026-01-09", tank:"RS250 Reef Tank",    category:"Water Change", notes:"10% Water Changed." },
  { date:"2026-01-04", tank:"RS250 Reef Tank",    category:"Dosage",       notes:"Rally Pro 100ml." },
  { date:"2026-01-04", tank:"IM20 Reef Tank",     category:"Dosage",       notes:"Rally Pro 30ml, Kick Ich Pro 30ml." },
  { date:"2025-08-16", tank:"IM20 Reef Tank",     category:"LiveStock",    notes:"Added Black Ice Clown fish, Carpenter Wrasse. Kryptonite Candy Cane, Ultra Toad Stool Leather, and more corals added." },
  { date:"2025-08-15", tank:"RS250 Reef Tank",    category:"Maintenance",  notes:"Added macro rocks and rearranged corals. Phosphate = 0.12." },
  { date:"2025-08-13", tank:"IM20 Reef Tank",     category:"Water Change", notes:"Tank Started Again." },
  { date:"2025-06-27", tank:"20G Gold Fish Tank", category:"Maintenance",  notes:"Replaced substrate with gravel, Décor changed. 100% Water changed, Quick Start added." },
  { date:"2025-06-21", tank:"RS250 Reef Tank",    category:"Water Change", notes:"10% Water changed. Filter washed." },
  { date:"2025-06-20", tank:"40G Community Tank", category:"Water Change", notes:"10% Water Changed. Algae building up. Started UV schedule." },
  { date:"2025-06-14", tank:"RS250 Reef Tank",    category:"Maintenance",  notes:"Salinity under control now. Refilled All for Reef solution." },
  { date:"2025-06-07", tank:"RS250 Reef Tank",    category:"Maintenance",  notes:"Salinity Adjusted. Back to 35 ppt. Hanna Tester ok. China tester busted." },
  { date:"2025-05-31", tank:"RS250 Reef Tank",    category:"Maintenance",  notes:"Calibrated Salinity testers. China tester is ok." },
  { date:"2025-05-25", tank:"40G Community Tank", category:"Maintenance",  notes:"Tank cracked while cleaning. New Tank started. Gravel Changed. Filter cleaned." },
  { date:"2025-05-22", tank:"40G Community Tank", category:"Water Change", notes:"30% Water changed. Removed plants. Tetras died. Dosage of medicines is the culprit." },
  { date:"2025-05-07", tank:"40G Community Tank", category:"Dosage",       notes:"Started Pimafix treatment." },
  { date:"2025-04-27", tank:"RS250 Reef Tank",    category:"LiveStock",    notes:"Added Acropora, Rock Flower Anemone & Clove Polyps." },
  { date:"2025-04-27", tank:"RS250 Reef Tank",    category:"Maintenance",  notes:"Scrubbed back wall, removed white critters." },
];

const TANK_COLORS = {
  "5G Betta Tank":      "#38bdf8",
  "10G GloFish Tank":   "#a78bfa",
  "20G Gold Fish Tank": "#fb923c",
  "40G Community Tank": "#4ade80",
  "IM20 Reef Tank":     "#f472b6",
  "RS250 Reef Tank":    "#fbbf24",
};

const CAT_COLORS = {
  "Water Change": "#38bdf8",
  "Maintenance":  "#a78bfa",
  "LiveStock":    "#4ade80",
  "Dosage":       "#fb923c",
  "Feeding":      "#fbbf24",
  "Other":        "#94a3b8",
};

const FW_PARAMS = ["nitrate","ph","alkalinity","ammonia"];
const SW_PARAMS = ["nitrate","phosphate","salinity","ph","alkalinity","calcium","magnesium"];

const PARAM_LABELS = {
  nitrate:"Nitrate (ppm)", phosphate:"Phosphate (ppm)", salinity:"Salinity (ppt)",
  ph:"pH", alkalinity:"Alkalinity (dKH)", calcium:"Calcium (ppm)",
  magnesium:"Magnesium (ppm)", ammonia:"Ammonia (ppm)",
};

const PARAM_SAFE = {
  nitrate:   {min:0,   max:20,   color:"#4ade80"},
  phosphate: {min:0,   max:0.1,  color:"#f472b6"},
  salinity:  {min:33,  max:36,   color:"#38bdf8"},
  ph:        {min:7.2, max:8.4,  color:"#fbbf24"},
  alkalinity:{min:8,   max:12,   color:"#a78bfa"},
  calcium:   {min:380, max:450,  color:"#fb923c"},
  magnesium: {min:1250,max:1350, color:"#38bdf8"},
  ammonia:   {min:0,   max:0,    color:"#f87171"},
};

const NAV = ["Dashboard","Log Parameters","Log Maintenance","Log Livestock","My Tanks","Diary"];

function fmt(d) {
  if (!d) return "";
  return new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
}
function nowTs() {
  return new Date().toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"});
}

const S = {
  inp: {width:"100%",background:"#07111f",border:"1px solid #1e3a5f",borderRadius:8,padding:"9px 12px",color:"#e2e8f0",fontSize:14,outline:"none"},
  sel: {width:"100%",background:"#07111f",border:"1px solid #1e3a5f",borderRadius:8,padding:"9px 12px",color:"#e2e8f0",fontSize:14,outline:"none"},
  btn: {background:"linear-gradient(135deg,#0369a1,#0ea5e9)",border:"none",borderRadius:10,padding:"12px 28px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"},
  card: {background:"#0d1a2d",border:"1px solid #1e3a5f",borderRadius:14,padding:20},
};

function Field({label,children}) {
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:"block",fontSize:11,fontWeight:600,color:"#64748b",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>{label}</label>
      {children}
    </div>
  );
}

// ─── Livestock seed (live animals only, seeded from LIVESTOCK constant) ───────
const LS_SEED = Object.entries(LIVESTOCK).flatMap(([tank, items]) =>
  items.map((l, i) => ({
    id: tank.slice(0,3) + i,
    tank,
    name: l.name,
    qty: l.qty,
    type: tank.includes("Reef") ? "Saltwater Fish" : "Freshwater Fish",
    dateAdded: TODAY_STR,
    dateDied: null,
    status: "Live",
    comments: "",
    daysAlive: l.days,
  }))
);

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [params, setParams] = useState(PARAMS_SEED);
  const [diary, setDiary] = useState(DIARY_SEED);
  const [lsLog, setLsLog] = useState(LS_SEED);
  const [activeTank, setActiveTank] = useState("RS250 Reef Tank");
  const [toast, setToast] = useState(null);

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null),2800); }

  return (
    <div style={{minHeight:"100vh",background:"#080d1a",color:"#e2e8f0",fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box}input,select,textarea{color-scheme:dark}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#0d1526}::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:3px}`}</style>
      <header style={{background:"linear-gradient(135deg,#0a1628,#0d2040)",borderBottom:"1px solid #1e3a5f",padding:"0 20px",display:"flex",alignItems:"center",gap:14,height:56,position:"sticky",top:0,zIndex:100}}>
        <span style={{fontSize:24}}>🐠</span>
        <span style={{fontWeight:700,fontSize:17,color:"#7dd3fc"}}>AquaLog</span>
        <span style={{color:"#334155"}}>|</span>
        <nav style={{display:"flex",gap:3}}>
          {NAV.map(n=>(
            <button key={n} onClick={()=>setPage(n)} style={{background:page===n?"rgba(56,189,248,0.15)":"transparent",color:page===n?"#7dd3fc":"#64748b",border:page===n?"1px solid rgba(56,189,248,0.3)":"1px solid transparent",borderRadius:8,padding:"4px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>
              {n}
            </button>
          ))}
        </nav>
        <div style={{marginLeft:"auto",fontSize:11,color:"#334155"}}>May 23, 2026</div>
      </header>
      {toast && <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#0f7a4a",color:"#fff",padding:"10px 22px",borderRadius:10,fontWeight:600,zIndex:999}}>✓ {toast}</div>}
      <main style={{maxWidth:1320,margin:"0 auto",padding:"24px 20px"}}>
        {page==="Dashboard"       && <Dashboard params={params} diary={diary} activeTank={activeTank} setActiveTank={setActiveTank}/>}
        {page==="Log Parameters"  && <LogParams  params={params} setParams={setParams} showToast={showToast}/>}
        {page==="Log Maintenance" && <LogMaint   diary={diary}   setDiary={setDiary}   showToast={showToast}/>}
        {page==="Log Livestock"   && <LogLivestock lsLog={lsLog} setLsLog={setLsLog}   showToast={showToast}/>}
        {page==="My Tanks"        && <MyTanks    params={params} diary={diary}/>}
        {page==="Diary"           && <DiaryPage  diary={diary}/>}
      </main>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({params,diary,activeTank,setActiveTank}) {
  const tank  = TANKS.find(t=>t.id===activeTank);
  const isSW  = tank?.type==="saltwater";
  const pKeys = isSW ? SW_PARAMS : FW_PARAMS;
  const color = TANK_COLORS[activeTank];

  const allTP  = params.filter(p=>p.tank===activeTank).sort((a,b)=>b.date.localeCompare(a.date));
  const latest = allTP[0];
  const recent = [...params].filter(p=>p.tank===activeTank && p.date>=FOUR_WEEKS_AGO).sort((a,b)=>a.date.localeCompare(b.date));
  const recentDiary = diary.filter(d=>(d.tank===activeTank)&&d.date>=FOUR_WEEKS_AGO).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const livestock = LIVESTOCK[activeTank]||[];
  const totalAnimals = livestock.reduce((s,l)=>s+l.qty,0);

  return (
    <div>
      {/* All tanks overview — top of page */}
      <div style={{...S.card,marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:14,color:"#cbd5e1"}}>All Tanks — Quick Status</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10}}>
          {TANKS.map(t=>{
            const last=params.filter(p=>p.tank===t.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
            const liveCount=(LIVESTOCK[t.id]||[]).reduce((s,l)=>s+l.qty,0);
            const isActive=activeTank===t.id;
            return (
              <button key={t.id} onClick={()=>setActiveTank(t.id)} style={{background:isActive?`${TANK_COLORS[t.id]}18`:"#07111f",border:`1.5px solid ${isActive?TANK_COLORS[t.id]:TANK_COLORS[t.id]+"44"}`,borderRadius:12,padding:"12px 8px",cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
                <div style={{fontSize:18,marginBottom:3}}>{t.type==="saltwater"?"🪸":"🐡"}</div>
                <div style={{fontSize:11,fontWeight:700,color:TANK_COLORS[t.id],marginBottom:3,lineHeight:1.3}}>{t.id}</div>
                <div style={{fontSize:10,color:"#475569",marginBottom:3}}>{t.size} · {liveCount} live</div>
                {last?.nitrate!=null&&<div style={{fontSize:10,color:last.nitrate<=20?"#4ade80":"#f87171"}}>NO₃ {last.nitrate} {last.nitrate<=20?"✓":"⚠"}</div>}
                {last?.date&&<div style={{fontSize:9,color:"#334155",marginTop:2}}>Last: {fmt(last.date)}</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tank strip */}
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {TANKS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTank(t.id)} style={{background:activeTank===t.id?`${TANK_COLORS[t.id]}22`:"#0d1a2d",border:`1.5px solid ${activeTank===t.id?TANK_COLORS[t.id]:"#1e3a5f"}`,borderRadius:10,padding:"7px 14px",cursor:"pointer",color:activeTank===t.id?TANK_COLORS[t.id]:"#64748b",fontWeight:600,fontSize:12}}>
            {t.type==="saltwater"?"🪸":"🐡"} {t.id}
          </button>
        ))}
      </div>

      {/* Top 3 cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16}}>
        {/* Tank info */}
        <div style={{...S.card,borderTop:`3px solid ${color}`}}>
          <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",marginBottom:10}}>Tank Info</div>
          <div style={{fontSize:18,fontWeight:700,color,marginBottom:3}}>{tank?.id}</div>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:2}}>{isSW?"🐠 Saltwater":"🐟 Freshwater"} · {tank?.size}</div>
          <div style={{fontSize:11,color:"#475569",marginBottom:12}}>Since {fmt(tank?.setup)}</div>
          <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",marginBottom:6}}>Live Inhabitants ({totalAnimals})</div>
          <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:150,overflowY:"auto"}}>
            {livestock.map((l,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#94a3b8",background:"#07111f",borderRadius:5,padding:"3px 8px"}}>
                <span>{l.qty>1?`${l.qty}× `:""}{l.name}</span>
                <span style={{color:"#475569",fontFamily:"'DM Mono',monospace",marginLeft:6,whiteSpace:"nowrap"}}>{l.days}d</span>
              </div>
            ))}
          </div>
        </div>

        {/* Latest readings */}
        <div style={S.card}>
          <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",marginBottom:10}}>
            Latest Readings {latest&&<span style={{color:"#475569",fontWeight:400}}>· {fmt(latest.date)}</span>}
          </div>
          {latest ? (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {pKeys.filter(p=>latest[p]!=null).map(p=>{
                const v=latest[p], safe=PARAM_SAFE[p], ok=v>=safe.min&&v<=safe.max;
                return (
                  <div key={p} style={{background:"#07111f",borderRadius:8,padding:"9px 11px"}}>
                    <div style={{fontSize:10,color:"#475569",marginBottom:2}}>{PARAM_LABELS[p]}</div>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{fontSize:17,fontWeight:700,color:ok?"#4ade80":"#f87171",fontFamily:"'DM Mono',monospace"}}>{v}</span>
                      <span style={{fontSize:12,color:ok?"#4ade80":"#f87171"}}>{ok?"✓":"⚠"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div style={{color:"#475569",fontSize:13}}>No readings yet.</div>}
        </div>

        {/* Recent maintenance */}
        <div style={S.card}>
          <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",marginBottom:10}}>Maintenance — Last 4 Weeks</div>
          {recentDiary.length>0 ? recentDiary.map((d,i)=>(
            <div key={i} style={{borderBottom:i<recentDiary.length-1?"1px solid #0f2035":"none",paddingBottom:7,marginBottom:7}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                <span style={{fontSize:10,background:`${CAT_COLORS[d.category]||"#64748b"}22`,color:CAT_COLORS[d.category]||"#64748b",borderRadius:4,padding:"1px 6px",fontWeight:600}}>{d.category}</span>
                <span style={{fontSize:10,color:"#334155"}}>{fmt(d.date)}</span>
              </div>
              <div style={{fontSize:11,color:"#94a3b8",lineHeight:1.4}}>{d.notes}</div>
            </div>
          )) : <div style={{color:"#475569",fontSize:13}}>No activity in last 4 weeks.</div>}
        </div>
      </div>

      {/* Trend charts */}
      <div style={{...S.card,marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:4,color:"#cbd5e1"}}>Parameter Trends — Last 4 Weeks</div>
        <div style={{fontSize:11,color:"#475569",marginBottom:16}}>{recent.length===0?"No readings in the last 4 weeks for this tank.":`${recent.length} readings · ${fmt(recent[0]?.date)} → ${fmt(recent[recent.length-1]?.date)}`}</div>
        {recent.length>0 ? (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            {pKeys.map(param=>{
              const data=recent.filter(p=>p[param]!=null).map(p=>({date:fmt(p.date),value:p[param]}));
              if(!data.length) return null;
              const col=PARAM_SAFE[param]?.color||"#38bdf8";
              return (
                <div key={param}>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:600,marginBottom:5}}>{PARAM_LABELS[param]}</div>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={data} margin={{top:4,right:8,left:-22,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0f2035"/>
                      <XAxis dataKey="date" tick={{fill:"#475569",fontSize:9}}/>
                      <YAxis tick={{fill:"#475569",fontSize:9}}/>
                      <Tooltip contentStyle={{background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:8,fontSize:11}}/>
                      <Line type="monotone" dataKey="value" stroke={col} strokeWidth={2} dot={{fill:col,r:3}} activeDot={{r:5}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        ) : <div style={{color:"#334155",fontSize:13,padding:"12px 0"}}>No readings in the last 4 weeks for this tank. Log new readings to see trends.</div>}
      </div>

    </div>
  );
}

// ─── Log Parameters ───────────────────────────────────────────────────────────
function LogParams({params,setParams,showToast}) {
  const [tank, setTank] = useState(TANKS[0].id);
  const [date, setDate] = useState(TODAY_STR);
  const [vals, setVals] = useState({});
  const [notes,setNotes] = useState("");

  const isSW = TANKS.find(t=>t.id===tank)?.type==="saltwater";
  const pKeys = isSW ? SW_PARAMS : FW_PARAMS;
  const last  = params.filter(p=>p.tank===tank).sort((a,b)=>b.date.localeCompare(a.date))[0];

  function submit() {
    const e={date,tank,notes,timestamp:nowTs()};
    pKeys.forEach(p=>{if(vals[p]!==""&&vals[p]!==undefined)e[p]=parseFloat(vals[p]);});
    setParams(prev=>[...prev,e]);
    setVals({}); setNotes("");
    showToast("Parameters logged!");
  }

  return (
    <div style={{maxWidth:700}}>
      <div style={{marginBottom:24}}><div style={{fontSize:22,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>Log Parameters</div><div style={{fontSize:13,color:"#475569"}}>Record water chemistry readings</div></div>
      <div style={{...S.card,borderRadius:16,padding:26}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:18}}>
          <Field label="Tank"><select value={tank} onChange={e=>{setTank(e.target.value);setVals({});}} style={S.sel}>{TANKS.map(t=><option key={t.id} value={t.id}>{t.type==="saltwater"?"🪸":"🐡"} {t.id}</option>)}</select></Field>
          <Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={S.inp}/></Field>
        </div>
        <div style={{fontSize:11,color:"#334155",marginBottom:18,fontFamily:"'DM Mono',monospace"}}>📍 Timestamp: {nowTs()}</div>
        {last&&<div style={{background:"#07111f",borderRadius:8,padding:"9px 13px",marginBottom:18,fontSize:11,color:"#64748b"}}><span style={{fontWeight:600,color:"#475569"}}>Last reading:</span> {fmt(last.date)} · {pKeys.filter(p=>last[p]!=null).map(p=>`${p}: ${last[p]}`).join(" · ")}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
          {pKeys.map(p=>{
            const v=vals[p], n=parseFloat(v), safe=PARAM_SAFE[p];
            const ok=v!==""&&v!==undefined&&!isNaN(n)?(n>=safe.min&&n<=safe.max):null;
            return (
              <Field key={p} label={PARAM_LABELS[p]}>
                <div style={{position:"relative"}}>
                  <input type="number" step="0.01" placeholder={`Safe: ${safe.min}–${safe.max}`} value={v||""} onChange={e=>setVals(prev=>({...prev,[p]:e.target.value}))} style={{...S.inp,borderColor:ok===false?"#f87171":ok===true?"#4ade80":"#1e3a5f",paddingRight:28}}/>
                  {ok!==null&&<span style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",fontSize:13}}>{ok?"✓":"⚠"}</span>}
                </div>
              </Field>
            );
          })}
        </div>
        <Field label="Notes (optional)"><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Observations..." style={{...S.inp,resize:"vertical",fontFamily:"inherit",marginBottom:18}}/></Field>
        <button onClick={submit} style={S.btn}>💧 Save Parameters</button>
      </div>
    </div>
  );
}

// ─── Log Maintenance ──────────────────────────────────────────────────────────
function LogMaint({diary,setDiary,showToast}) {
  const [tank,setTank]   = useState(TANKS[0].id);
  const [date,setDate]   = useState(TODAY_STR);
  const [cat,setCat]     = useState("Water Change");
  const [pct,setPct]     = useState("");
  const [notes,setNotes] = useState("");
  const CATS = ["Water Change","Maintenance","LiveStock","Dosage","Feeding","Other"];

  function submit() {
    const n = cat==="Water Change"&&pct ? `${pct}% Water Changed. ${notes}`.trim() : notes;
    setDiary(prev=>[...prev,{date,tank,category:cat,notes:n,timestamp:nowTs()}]);
    setNotes(""); setPct("");
    showToast("Maintenance logged!");
  }

  const recent=diary.filter(d=>d.tank===tank&&d.date>=FOUR_WEEKS_AGO).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);

  return (
    <div style={{maxWidth:700}}>
      <div style={{marginBottom:24}}><div style={{fontSize:22,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>Log Maintenance</div><div style={{fontSize:13,color:"#475569"}}>Record maintenance activities</div></div>
      <div style={{...S.card,borderRadius:16,padding:26}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:18}}>
          <Field label="Tank"><select value={tank} onChange={e=>setTank(e.target.value)} style={S.sel}>{TANKS.map(t=><option key={t.id} value={t.id}>{t.type==="saltwater"?"🪸":"🐡"} {t.id}</option>)}</select></Field>
          <Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={S.inp}/></Field>
        </div>
        <div style={{fontSize:11,color:"#334155",marginBottom:18,fontFamily:"'DM Mono',monospace"}}>📍 Timestamp: {nowTs()}</div>
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>Category</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            {CATS.map(c=><button key={c} onClick={()=>setCat(c)} style={{background:cat===c?`${CAT_COLORS[c]||"#64748b"}22`:"#07111f",border:`1.5px solid ${cat===c?CAT_COLORS[c]||"#64748b":"#1e3a5f"}`,color:cat===c?CAT_COLORS[c]||"#64748b":"#64748b",borderRadius:18,padding:"5px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>{c}</button>)}
          </div>
        </div>
        {cat==="Water Change"&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",marginBottom:7}}>Water Change %</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[10,15,20,25,30,50,80,100].map(p=><button key={p} onClick={()=>setPct(p.toString())} style={{background:pct===p.toString()?"#1e3a5f":"#07111f",border:`1px solid ${pct===p.toString()?"#38bdf8":"#1e3a5f"}`,color:pct===p.toString()?"#7dd3fc":"#64748b",borderRadius:7,padding:"5px 9px",cursor:"pointer",fontSize:11,fontWeight:600}}>{p}%</button>)}
              <input type="number" placeholder="%" value={pct} onChange={e=>setPct(e.target.value)} style={{...S.inp,width:65}}/>
            </div>
          </div>
        )}
        <Field label="Notes"><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="What did you do? Any observations..." style={{...S.inp,resize:"vertical",fontFamily:"inherit",marginBottom:18}}/></Field>
        <button onClick={submit} style={S.btn}>🔧 Save Log</button>
      </div>
      {recent.length>0&&(
        <div style={{...S.card,marginTop:16}}>
          <div style={{fontSize:13,fontWeight:700,color:"#cbd5e1",marginBottom:12}}>Last 4 Weeks — {tank}</div>
          {recent.map((d,i)=>(
            <div key={i} style={{display:"flex",gap:10,borderBottom:"1px solid #0f2035",paddingBottom:7,marginBottom:7}}>
              <span style={{fontSize:10,background:`${CAT_COLORS[d.category]||"#64748b"}22`,color:CAT_COLORS[d.category]||"#64748b",borderRadius:4,padding:"2px 7px",fontWeight:600,whiteSpace:"nowrap",marginTop:1}}>{d.category}</span>
              <div><div style={{fontSize:10,color:"#475569",marginBottom:2}}>{fmt(d.date)}</div><div style={{fontSize:11,color:"#94a3b8"}}>{d.notes}</div></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── My Tanks ─────────────────────────────────────────────────────────────────
function MyTanks({params,diary}) {
  const [exp,setExp] = useState(null);
  return (
    <div>
      <div style={{marginBottom:24}}><div style={{fontSize:22,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>My Tanks</div><div style={{fontSize:13,color:"#475569"}}>6 tanks · 4 freshwater · 2 saltwater</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {TANKS.map(t=>{
          const ls    = LIVESTOCK[t.id]||[];
          const total = ls.reduce((s,l)=>s+l.qty,0);
          const last  = params.filter(p=>p.tank===t.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
          const lDiary= diary.filter(d=>d.tank===t.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
          const open  = exp===t.id;
          return (
            <div key={t.id} style={{background:"#0d1a2d",border:"1px solid #1e3a5f",borderRadius:16,overflow:"hidden",borderTop:`3px solid ${TANK_COLORS[t.id]}`}}>
              <div style={{padding:"18px 22px",borderBottom:"1px solid #0f2035"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div><div style={{fontSize:17,fontWeight:700,color:TANK_COLORS[t.id],marginBottom:3}}>{t.id}</div><div style={{fontSize:12,color:"#64748b"}}>{t.type==="saltwater"?"🐠 Saltwater":"🐟 Freshwater"} · {t.size} · Setup {fmt(t.setup)}</div></div>
                  <div style={{fontSize:24}}>{t.type==="saltwater"?"🪸":"🐡"}</div>
                </div>
              </div>
              <div style={{padding:"12px 22px",borderBottom:"1px solid #0f2035"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                  <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em"}}>Live Inhabitants ({total})</div>
                  {ls.length>4&&<button onClick={()=>setExp(open?null:t.id)} style={{fontSize:11,color:"#38bdf8",background:"none",border:"none",cursor:"pointer",padding:0}}>{open?"▲ less":"▼ show all"}</button>}
                </div>
                {(open?ls:ls.slice(0,4)).map((l,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#94a3b8",padding:"3px 0",borderBottom:"1px solid #0a1628"}}>
                    <span>{l.qty>1?`${l.qty}× `:""}{l.name}</span>
                    <span style={{color:"#475569",fontFamily:"'DM Mono',monospace"}}>{l.days}d</span>
                  </div>
                ))}
                {!open&&ls.length>4&&<div style={{fontSize:10,color:"#334155",marginTop:4}}>+{ls.length-4} more</div>}
              </div>
              <div style={{padding:"10px 22px",display:"flex",gap:24}}>
                <div><div style={{fontSize:9,color:"#334155",fontWeight:600,textTransform:"uppercase",marginBottom:2}}>Last Parameters</div><div style={{fontSize:11,color:"#64748b"}}>{last?fmt(last.date):"None"}</div></div>
                <div><div style={{fontSize:9,color:"#334155",fontWeight:600,textTransform:"uppercase",marginBottom:2}}>Last Maintenance</div><div style={{fontSize:11,color:"#64748b"}}>{lDiary?`${fmt(lDiary.date)} · ${lDiary.category}`:"None"}</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Diary ────────────────────────────────────────────────────────────────────
function DiaryPage({diary}) {
  const [fTank,setFTank] = useState("All");
  const [fCat, setFCat]  = useState("All");
  const [only4w,setOnly4w] = useState(false);

  const tanks = ["All",...Array.from(new Set(diary.map(d=>d.tank).filter(Boolean)))];
  const cats  = ["All",...Array.from(new Set(diary.map(d=>d.category)))];

  const list = diary
    .filter(d=>fTank==="All"||d.tank===fTank)
    .filter(d=>fCat==="All"||d.category===fCat)
    .filter(d=>!only4w||d.date>=FOUR_WEEKS_AGO)
    .sort((a,b)=>b.date.localeCompare(a.date));

  const grp = {};
  list.forEach(d=>{if(!grp[d.date])grp[d.date]=[];grp[d.date].push(d);});

  return (
    <div>
      <div style={{marginBottom:22,display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:10}}>
        <div><div style={{fontSize:22,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>Maintenance Diary</div><div style={{fontSize:13,color:"#475569"}}>{list.length} entries</div></div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>setOnly4w(v=>!v)} style={{background:only4w?"rgba(56,189,248,0.15)":"#0d1a2d",border:`1px solid ${only4w?"#38bdf8":"#1e3a5f"}`,color:only4w?"#7dd3fc":"#64748b",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>{only4w?"Last 4 Weeks ✓":"Last 4 Weeks"}</button>
          <select value={fTank} onChange={e=>setFTank(e.target.value)} style={{...S.sel,width:"auto"}}>{tanks.map(t=><option key={t} value={t}>{t}</option>)}</select>
          <select value={fCat}  onChange={e=>setFCat(e.target.value)}  style={{...S.sel,width:"auto"}}>{cats.map(c=><option key={c} value={c}>{c}</option>)}</select>
        </div>
      </div>
      {Object.entries(grp).map(([date,entries])=>(
        <div key={date} style={{marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:700,color:"#475569",letterSpacing:".05em",textTransform:"uppercase",marginBottom:8,display:"flex",alignItems:"center",gap:7}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#1e3a5f",display:"inline-block"}}></span>
            {new Date(date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {entries.map((e,i)=>(
              <div key={i} style={{background:"#0d1a2d",border:"1px solid #1e3a5f",borderRadius:11,padding:"11px 16px",display:"flex",gap:12,alignItems:"flex-start",borderLeft:`3px solid ${TANK_COLORS[e.tank]||"#334155"}`}}>
                <div style={{minWidth:105}}>
                  <div style={{fontSize:11,fontWeight:700,color:TANK_COLORS[e.tank]||"#94a3b8",marginBottom:3}}>{e.tank}</div>
                  <span style={{fontSize:10,background:`${CAT_COLORS[e.category]||"#64748b"}22`,color:CAT_COLORS[e.category]||"#64748b",borderRadius:4,padding:"2px 7px",fontWeight:600}}>{e.category}</span>
                </div>
                <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.5}}>{e.notes}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Log Livestock ────────────────────────────────────────────────────────────
const LS_TYPES = [
  "Freshwater Fish","Saltwater Fish","Saltwater Invert","Freshwater Invert",
  "Corals","Live Plants","Other",
];
const LS_EVENTS = ["Added","Died","Donated/Removed","Moved Between Tanks"];

function LogLivestock({ lsLog, setLsLog, showToast }) {
  const [tab, setTab] = useState("add");

  return (
    <div>
      <div style={{marginBottom:22}}>
        <div style={{fontSize:22,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>Log Livestock</div>
        <div style={{fontSize:13,color:"#475569"}}>Track additions, losses, and transfers across all tanks</div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:22}}>
        {[["add","➕ Add Entry"],["view","📋 View All"]].map(([k,label])=>(
          <button key={k} onClick={()=>setTab(k)} style={{background:tab===k?"rgba(56,189,248,0.15)":"#0d1a2d",border:`1.5px solid ${tab===k?"#38bdf8":"#1e3a5f"}`,color:tab===k?"#7dd3fc":"#64748b",borderRadius:10,padding:"8px 20px",cursor:"pointer",fontSize:13,fontWeight:700}}>
            {label}
          </button>
        ))}
      </div>
      {tab==="add"  && <LSAddForm  lsLog={lsLog} setLsLog={setLsLog} showToast={showToast}/>}
      {tab==="view" && <LSViewAll  lsLog={lsLog} setLsLog={setLsLog} showToast={showToast}/>}
    </div>
  );
}

function LSAddForm({ lsLog, setLsLog, showToast }) {
  const blank = { tank:TANKS[0].id, event:"Added", name:"", qty:1, type:"", dateAdded:TODAY_STR, dateDied:"", moveTo:"", comments:"" };
  const [f, setF] = useState(blank);
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  // Autocomplete suggestions from existing livestock names
  const allNames = [...new Set(lsLog.map(l=>l.name))].sort();

  function submit() {
    if (!f.name.trim()) { showToast("Please enter a name"); return; }
    if (f.event === "Added") {
      const entry = {
        id: Date.now().toString(36),
        tank: f.tank, name: f.name.trim(), qty: Number(f.qty),
        type: f.type || "Unknown", dateAdded: f.dateAdded,
        dateDied: null, status: "Live",
        comments: f.comments, daysAlive: 0,
        timestamp: nowTs(),
      };
      setLsLog(p => [...p, entry]);
      showToast(`${f.name} added to ${f.tank}!`);
    } else if (f.event === "Died") {
      setLsLog(p => p.map(l =>
        l.tank === f.tank && l.name === f.name
          ? { ...l, status: "Died", dateDied: f.dateDied || TODAY_STR }
          : l
      ));
      showToast(`${f.name} marked as deceased.`);
    } else if (f.event === "Donated/Removed") {
      setLsLog(p => p.map(l =>
        l.tank === f.tank && l.name === f.name
          ? { ...l, status: "Removed", dateDied: f.dateDied || TODAY_STR, comments: f.comments || "Donated/Removed" }
          : l
      ));
      showToast(`${f.name} removed from ${f.tank}.`);
    } else if (f.event === "Moved Between Tanks" && f.moveTo) {
      setLsLog(p => p.map(l =>
        l.tank === f.tank && l.name === f.name
          ? { ...l, tank: f.moveTo, comments: (l.comments ? l.comments + "; " : "") + `Moved from ${f.tank} on ${f.dateAdded}` }
          : l
      ));
      showToast(`${f.name} moved to ${f.moveTo}.`);
    }
    setF(blank);
  }

  const tankLS = lsLog.filter(l => l.tank === f.tank && l.status === "Live");

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* Top row: tank selector + residents panel side by side */}
      <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:16,alignItems:"start"}}>
        {/* Tank selector card */}
        <div style={{...S.card,borderRadius:14,padding:20}}>
          <Field label="Tank">
            <select value={f.tank} onChange={e=>set("tank",e.target.value)} style={S.sel}>
              {TANKS.map(t=><option key={t.id} value={t.id}>{t.type==="saltwater"?"🪸":"🐡"} {t.id}</option>)}
            </select>
          </Field>
          <div style={{fontSize:11,color:"#334155",fontFamily:"'DM Mono',monospace",marginTop:4}}>📍 {nowTs()}</div>
        </div>

        {/* Current residents — full remaining width */}
        <div style={{...S.card,borderRadius:14,padding:20}}>
          <div style={{fontSize:12,fontWeight:700,color:"#cbd5e1",marginBottom:14}}>
            🐟 Current Residents — <span style={{color:TANK_COLORS[f.tank]||"#94a3b8"}}>{f.tank}</span>
          </div>
          {tankLS.length > 0 ? (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
              {tankLS.map((l,i)=>(
                <div key={l.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#07111f",borderRadius:8,padding:"8px 12px"}}>
                  <div>
                    <div style={{fontSize:12,color:"#e2e8f0",fontWeight:600}}>{l.qty>1?`${l.qty}× `:""}{l.name}</div>
                    <div style={{fontSize:10,color:"#475569"}}>{l.type} · {l.daysAlive}d</div>
                  </div>
                  <span style={{fontSize:10,background:"rgba(74,222,128,0.15)",color:"#4ade80",borderRadius:4,padding:"2px 7px",fontWeight:600,marginLeft:8,whiteSpace:"nowrap"}}>Live</span>
                </div>
              ))}
            </div>
          ) : <div style={{fontSize:12,color:"#334155"}}>No live entries for this tank yet.</div>}
        </div>
      </div>

      {/* Event type — full page width */}
      <div style={{...S.card,borderRadius:14,padding:20}}>
        <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",marginBottom:12}}>Event Type</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
          {LS_EVENTS.map(e=>{
            const cols = { "Added":"#4ade80","Died":"#f87171","Donated/Removed":"#fb923c","Moved Between Tanks":"#a78bfa" };
            const c = cols[e]||"#64748b";
            const icons = { "Added":"➕","Died":"💀","Donated/Removed":"📦","Moved Between Tanks":"🔄" };
            return (
              <button key={e} onClick={()=>set("event",e)} style={{background:f.event===e?`${c}22`:"#07111f",border:`2px solid ${f.event===e?c:"#1e3a5f"}`,color:f.event===e?c:"#64748b",borderRadius:12,padding:"14px 12px",cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",flexDirection:"column",alignItems:"center",gap:6,transition:"all .15s"}}>
                <span style={{fontSize:22}}>{icons[e]}</span>
                <span>{e}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form fields */}
      <div style={{...S.card,borderRadius:16,padding:26}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Field label={f.event==="Died"||f.event==="Donated/Removed" ? "Date of Event" : "Date Added"}>
            <input type="date" value={f.event==="Died"||f.event==="Donated/Removed" ? (f.dateDied||TODAY_STR) : f.dateAdded}
              onChange={e => f.event==="Died"||f.event==="Donated/Removed" ? set("dateDied",e.target.value) : set("dateAdded",e.target.value)}
              style={S.inp}/>
          </Field>
          <Field label="Type / Category">
            <select value={f.type} onChange={e=>set("type",e.target.value)} style={S.sel}>
              <option value="">— select —</option>
              {LS_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
          <Field label="Name">
            <input list="ls-names" value={f.name} onChange={e=>set("name",e.target.value)}
              placeholder="e.g. Ocellaris Clownfish" style={S.inp}/>
            <datalist id="ls-names">{allNames.map(n=><option key={n} value={n}/>)}</datalist>
          </Field>
          <Field label="Quantity">
            <input type="number" min="1" value={f.qty} onChange={e=>set("qty",e.target.value)} style={S.inp}/>
          </Field>
        </div>

        {f.event==="Moved Between Tanks" && (
          <Field label="Move To Tank">
            <select value={f.moveTo} onChange={e=>set("moveTo",e.target.value)} style={S.sel}>
              <option value="">— select destination —</option>
              {TANKS.filter(t=>t.id!==f.tank).map(t=><option key={t.id} value={t.id}>{t.id}</option>)}
            </select>
          </Field>
        )}

        <Field label="Comments / Notes">
          <textarea value={f.comments} onChange={e=>set("comments",e.target.value)} rows={2}
            placeholder={f.event==="Died"?"Cause of death…":f.event==="Added"?"Source, price, notes…":"Notes…"}
            style={{...S.inp,resize:"vertical",fontFamily:"inherit"}}/>
        </Field>

        <button onClick={submit} style={{
          ...S.btn, marginTop:8,
          background: f.event==="Died"?"linear-gradient(135deg,#7f1d1d,#ef4444)":f.event==="Donated/Removed"?"linear-gradient(135deg,#7c2d12,#f97316)":f.event==="Moved Between Tanks"?"linear-gradient(135deg,#4c1d95,#8b5cf6)":"linear-gradient(135deg,#14532d,#22c55e)"
        }}>
          {f.event==="Added"?"➕ Add to Tank":f.event==="Died"?"💀 Record Death":f.event==="Donated/Removed"?"📦 Record Removal":"🔄 Move to New Tank"}
        </button>
      </div>
    </div>
  );
}

function LSViewAll({ lsLog, setLsLog, showToast }) {
  const [fTank, setFTank] = useState("All");
  const [fStatus, setFStatus] = useState("Live");
  const [fType, setFType] = useState("All");
  const [confirmId, setConfirmId] = useState(null);

  const tanks   = ["All", ...TANKS.map(t=>t.id)];
  const statuses = ["All","Live","Died","Removed"];
  const types   = ["All",...LS_TYPES];

  const list = lsLog
    .filter(l => fTank==="All"   || l.tank===fTank)
    .filter(l => fStatus==="All" || l.status===fStatus)
    .filter(l => fType==="All"   || l.type===fType)
    .sort((a,b) => (a.tank+a.name).localeCompare(b.tank+b.name));

  function markDead(id) {
    setLsLog(p=>p.map(l=>l.id===id?{...l,status:"Died",dateDied:TODAY_STR}:l));
    setConfirmId(null);
    showToast("Marked as deceased.");
  }

  const statusColor = { Live:"#4ade80", Died:"#f87171", Removed:"#fb923c" };

  return (
    <div>
      {/* Filters */}
      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap",alignItems:"center"}}>
        <select value={fTank}   onChange={e=>setFTank(e.target.value)}   style={{...S.sel,width:"auto"}}>
          {tanks.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <div style={{display:"flex",gap:6}}>
          {statuses.map(s=>{
            const c=statusColor[s]||"#64748b";
            return <button key={s} onClick={()=>setFStatus(s)} style={{background:fStatus===s?`${c}22`:"#0d1a2d",border:`1.5px solid ${fStatus===s?c:"#1e3a5f"}`,color:fStatus===s?c:"#64748b",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>{s}</button>;
          })}
        </div>
        <select value={fType} onChange={e=>setFType(e.target.value)} style={{...S.sel,width:"auto"}}>
          {types.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{fontSize:12,color:"#475569",marginLeft:"auto"}}>{list.length} entries</span>
      </div>

      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:"Total Live",  val:lsLog.filter(l=>l.status==="Live").reduce((s,l)=>s+l.qty,0),  color:"#4ade80"},
          {label:"Total Tanks", val:TANKS.length,                                                   color:"#38bdf8"},
          {label:"Died",        val:lsLog.filter(l=>l.status==="Died").length,                      color:"#f87171"},
          {label:"Removed",     val:lsLog.filter(l=>l.status==="Removed").length,                   color:"#fb923c"},
        ].map(({label,val,color})=>(
          <div key={label} style={{...S.card,borderTop:`2px solid ${color}`,padding:"14px 16px"}}>
            <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".07em",marginBottom:4}}>{label}</div>
            <div style={{fontSize:24,fontWeight:700,color,fontFamily:"'DM Mono',monospace"}}>{val}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{...S.card,padding:0,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 60px 90px 90px 1fr 80px",gap:0,background:"#07111f",padding:"10px 16px",fontSize:10,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",borderBottom:"1px solid #1e3a5f"}}>
          <span>Name</span><span>Tank</span><span>Type</span><span>Qty</span><span>Date Added</span><span>Date Died</span><span>Comments</span><span>Status</span>
        </div>
        {list.length===0 && <div style={{padding:24,color:"#334155",fontSize:13,textAlign:"center"}}>No entries match the filters.</div>}
        {list.map((l,i)=>(
          <div key={l.id||i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 60px 90px 90px 1fr 80px",gap:0,padding:"10px 16px",borderBottom:"1px solid #0f2035",background:i%2===0?"transparent":"#07111f08",alignItems:"center"}}>
            <span style={{fontSize:13,color:"#e2e8f0",fontWeight:600}}>{l.name}</span>
            <span style={{fontSize:11,color:TANK_COLORS[l.tank]||"#94a3b8",fontWeight:600}}>{l.tank}</span>
            <span style={{fontSize:11,color:"#64748b"}}>{l.type}</span>
            <span style={{fontSize:13,color:"#94a3b8",fontFamily:"'DM Mono',monospace"}}>{l.qty}</span>
            <span style={{fontSize:11,color:"#475569"}}>{fmt(l.dateAdded)}</span>
            <span style={{fontSize:11,color:l.dateDied?"#f87171":"#334155"}}>{l.dateDied?fmt(l.dateDied):"—"}</span>
            <span style={{fontSize:11,color:"#475569",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={l.comments}>{l.comments||"—"}</span>
            <span>
              {l.status==="Live" ? (
                confirmId===l.id ? (
                  <span style={{display:"flex",gap:4}}>
                    <button onClick={()=>markDead(l.id)} style={{fontSize:10,background:"#7f1d1d",border:"none",color:"#fca5a5",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontWeight:700}}>Confirm</button>
                    <button onClick={()=>setConfirmId(null)} style={{fontSize:10,background:"#1e3a5f",border:"none",color:"#94a3b8",borderRadius:5,padding:"3px 7px",cursor:"pointer"}}>✕</button>
                  </span>
                ) : (
                  <button onClick={()=>setConfirmId(l.id)} style={{fontSize:10,background:"rgba(74,222,128,0.15)",border:"1px solid #4ade80",color:"#4ade80",borderRadius:6,padding:"3px 9px",cursor:"pointer",fontWeight:700}}>Live</button>
                )
              ) : (
                <span style={{fontSize:10,background:`${statusColor[l.status]}22`,color:statusColor[l.status]||"#94a3b8",borderRadius:6,padding:"3px 9px",fontWeight:700}}>{l.status}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
