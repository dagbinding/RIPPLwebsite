// Re-encode a video for the web with Apple's built-in encoder (no ffmpeg needed).
//
//   swift scripts/encode_video.swift <in> <out.mp4> <width> <height> <kbps> <keyframe-interval>
//
// - H.264 High profile, no audio, moov atom up front (starts playing sooner)
// - No frame reordering (B-frames) and a short keyframe interval, so scroll-driven
//   seeking stays responsive in both directions
// - Scales to fill <width>x<height>, cropping the centre if the aspect differs
//   (e.g. a 720x1280 portrait cut for phones from a 16:9 render)
import AVFoundation

let args = CommandLine.arguments
guard args.count == 7, let width = Int(args[3]), let height = Int(args[4]),
      let kbps = Int(args[5]), let keyint = Int(args[6]) else {
    print("usage: swift encode_video.swift <in> <out.mp4> <width> <height> <kbps> <keyframe-interval>")
    exit(1)
}
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])
try? FileManager.default.removeItem(at: output)

let asset = AVURLAsset(url: input)
guard let track = asset.tracks(withMediaType: .video).first else { print("no video track"); exit(1) }

let reader = try AVAssetReader(asset: asset)
let readerOutput = AVAssetReaderTrackOutput(track: track, outputSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange,
])
reader.add(readerOutput)

let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true
let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoScalingModeKey: AVVideoScalingModeResizeAspectFill,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: kbps * 1000,
        AVVideoMaxKeyFrameIntervalKey: keyint,
        AVVideoAllowFrameReorderingKey: false,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    ],
])
writerInput.expectsMediaDataInRealTime = false
writer.add(writerInput)

reader.startReading()
writer.startWriting()
writer.startSession(atSourceTime: .zero)

let done = DispatchSemaphore(value: 0)
var frames = 0
writerInput.requestMediaDataWhenReady(on: DispatchQueue(label: "encode")) {
    while writerInput.isReadyForMoreMediaData {
        if let sample = readerOutput.copyNextSampleBuffer() {
            writerInput.append(sample)
            frames += 1
        } else {
            writerInput.markAsFinished()
            writer.finishWriting { done.signal() }
            return
        }
    }
}
done.wait()

if writer.status != .completed {
    print("failed: \(writer.error?.localizedDescription ?? "unknown")")
    exit(1)
}
let bytes = (try? FileManager.default.attributesOfItem(atPath: output.path)[.size] as? Int) ?? 0
print("\(output.lastPathComponent): \(width)x\(height), \(frames) frames, \(bytes / 1024)KB")
