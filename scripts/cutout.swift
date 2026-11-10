// Cut products out of studio-white photos with Apple Vision subject lifting (macOS 14+).
// Build:  swiftc -O scripts/cutout.swift -o /tmp/pos-cutout
// Run:    /tmp/pos-cutout <inDir> <outDir>     (every *.jpg -> same-name .png with alpha)
import Foundation
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count == 3 else { print("usage: pos-cutout <inDir> <outDir>"); exit(1) }
let inDir = URL(fileURLWithPath: args[1]), outDir = URL(fileURLWithPath: args[2])
try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
let files = try FileManager.default.contentsOfDirectory(at: inDir, includingPropertiesForKeys: nil)
  .filter { ["jpg", "jpeg", "png"].contains($0.pathExtension.lowercased()) }
  .sorted { $0.lastPathComponent < $1.lastPathComponent }
let ctx = CIContext()
let srgb = CGColorSpace(name: CGColorSpace.sRGB)!

for file in files {
  let outURL = outDir.appendingPathComponent(file.deletingPathExtension().lastPathComponent + ".png")
  if FileManager.default.fileExists(atPath: outURL.path) { continue }
  guard let input = CIImage(contentsOf: file) else { print("skip \(file.lastPathComponent)"); continue }
  let req = VNGenerateForegroundInstanceMaskRequest()
  let handler = VNImageRequestHandler(ciImage: input)
  do {
    try handler.perform([req])
    guard let obs = req.results?.first else { print("no subject: \(file.lastPathComponent)"); continue }
    let mask = CIImage(cvPixelBuffer: try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler))
    let blend = CIFilter.blendWithMask()
    blend.inputImage = input
    blend.backgroundImage = CIImage.empty()
    blend.maskImage = mask
    let out = blend.outputImage!.cropped(to: input.extent)
    let cg = ctx.createCGImage(out, from: out.extent, format: .RGBA8, colorSpace: srgb)!
    let dest = CGImageDestinationCreateWithURL(outURL as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, cg, nil)
    CGImageDestinationFinalize(dest)
    print("ok \(file.lastPathComponent)")
  } catch { print("error \(file.lastPathComponent): \(error)") }
}
