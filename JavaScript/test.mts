import FastNoiseLite, { Vector2, Vector3 } from "./FastNoiseLite.js";
import { PNG } from "pngjs";
import { createWriteStream } from "node:fs";

/*
 * This script generates an image with various types of noise.
 * Ensure the image does not change when changing the code.
 */

const testCases: { noise: FastNoiseLite, warp?: FastNoiseLite }[] = [];

// basic noise types and fractal types
for (const noiseType of [
    FastNoiseLite.NoiseType.OpenSimplex2,
    FastNoiseLite.NoiseType.OpenSimplex2S,
    FastNoiseLite.NoiseType.Perlin,
    FastNoiseLite.NoiseType.Value,
    FastNoiseLite.NoiseType.ValueCubic
]) {
    for (const fractalType of [
        FastNoiseLite.FractalType.None,
        FastNoiseLite.FractalType.FBm,
        FastNoiseLite.FractalType.PingPong,
        FastNoiseLite.FractalType.Ridged
    ]) {
        const noise = new FastNoiseLite();
        noise.SetDomainWarpAmp(0);
        noise.SetNoiseType(noiseType);
        noise.SetFractalType(fractalType)
        testCases.push({ noise });
    }
}

// cellular options
for (const distFunc of [
    FastNoiseLite.CellularDistanceFunction.Euclidean,
    FastNoiseLite.CellularDistanceFunction.EuclideanSq,
    FastNoiseLite.CellularDistanceFunction.Manhattan,
    FastNoiseLite.CellularDistanceFunction.Hybrid,
]) {
    for (const returnType of [
        FastNoiseLite.CellularReturnType.CellValue,
        FastNoiseLite.CellularReturnType.Distance,
        FastNoiseLite.CellularReturnType.Distance2,
        FastNoiseLite.CellularReturnType.Distance2Add,
        FastNoiseLite.CellularReturnType.Distance2Div,
        FastNoiseLite.CellularReturnType.Distance2Mul,
        FastNoiseLite.CellularReturnType.Distance2Sub,
    ]) {
        const noise = new FastNoiseLite();
        noise.SetDomainWarpAmp(0);
        noise.SetNoiseType(FastNoiseLite.NoiseType.Cellular);
        noise.SetCellularDistanceFunction(distFunc);
        noise.SetCellularReturnType(returnType);
        testCases.push({ noise });
    }
}

// domain warp
for (const warpType of [
    FastNoiseLite.DomainWarpType.BasicGrid,
    FastNoiseLite.DomainWarpType.OpenSimplex2,
    FastNoiseLite.DomainWarpType.OpenSimplex2Reduced,
]) {
    for (const warpFractalType of [
        FastNoiseLite.FractalType.DomainWarpIndependent,
        FastNoiseLite.FractalType.DomainWarpProgressive,
    ]) {
        const noise = new FastNoiseLite();
        const warp = new FastNoiseLite();
        warp.SetDomainWarpType(warpType);
        warp.SetFractalType(warpFractalType);
        warp.SetDomainWarpAmp(50);
        testCases.push({ noise, warp });
    }
}

const SCALE = 2;
const ROWS = 8;
const TEST_CASE_SIZE = 512;

const png = new PNG({
    width: TEST_CASE_SIZE * ROWS,
    height: (1 + Math.floor((2 * testCases.length) / ROWS)) * TEST_CASE_SIZE,
    filterType: -1
});

console.time("testCases");

let tcIndex = 0;
const Z = 42;
const pos2 = new Vector2(0, 0);
const pos3 = new Vector3(0, 0, Z);
for (const testCase of testCases) {
    for (let dims = 2; dims <= 3; dims++) {
        const yBase = Math.floor(tcIndex / ROWS) * TEST_CASE_SIZE;
        const xBase = (tcIndex % ROWS) * TEST_CASE_SIZE;
        console.log(tcIndex, dims, xBase, yBase)
        for (let y = 0; y < TEST_CASE_SIZE; y++) {
            for (let x = 0; x < TEST_CASE_SIZE; x++) {
                const idx = (png.width * (yBase + y) + (xBase + x)) << 2;

                const p: Vector2 | Vector3 = dims === 2 ? pos2 : pos3;
                p.x = x * SCALE;
                p.y = y * SCALE;
                if (testCase.warp) testCase.warp.DomainWrap(p);
                let v;
                if (dims === 2) {
                    v = testCase.noise.GetNoise(p.x, p.y);
                } else {
                    v = testCase.noise.GetNoise(p.x, p.y, (p as Vector3).z);
                }

                const color = (v + 1) * 128;
                png.data[idx] = color; // red
                png.data[idx + 1] = color; // green
                png.data[idx + 2] = color; // blue
                png.data[idx + 3] = 255; // alpha (0 is transparent)
            }
        }
        tcIndex += 1;
    }
}

console.timeEnd("testCases")

png.pack().pipe(createWriteStream('test-output.png'));
