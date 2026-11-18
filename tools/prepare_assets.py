from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np


ROOT = Path('public/images')
SOURCE = Path('artwork')
subject = Image.open(SOURCE / 'aetheria-world-cutout.png').convert('RGBA')
original = Image.open(SOURCE / 'aetheria-world.png').convert('RGB')


def save_subject(image, name):
    image.save(ROOT / name, quality=96, method=6)

# Preserve the original soft cloud contact beneath the whale, rather than a cut edge.
y, x = np.mgrid[0:subject.height, 0:subject.width]
contact = np.exp(-(((x - 390) / 235) ** 4 + ((y - 552) / 85) ** 4) * 1.5)
contact_alpha = np.maximum(np.asarray(subject.getchannel('A')), contact * 255).astype('uint8')
subject = Image.merge('RGBA', (*original.split(), Image.fromarray(contact_alpha)))
save_subject(subject, 'world-fallback.webp')

# The wheel is replaced by a moving, physically lit Three.js structure.
wheel_mask = Image.new('L', subject.size, 0)
outline = [
    (782, 90), (982, 90), (982, 321), (958, 324), (941, 328),
    (923, 329), (915, 314), (906, 310), (903, 300),
    (892, 292), (892, 284), (886, 279), (884, 270),
    (871, 265), (866, 259), (858, 256), (855, 252),
    (848, 249), (838, 245), (827, 246), (825, 251),
    (820, 247), (811, 251), (808, 244), (801, 246),
    (793, 235), (782, 233),
]
ImageDraw.Draw(wheel_mask).polygon(outline, fill=255)
alpha = np.asarray(subject.getchannel('A')).copy()
alpha[np.asarray(wheel_mask) > 128] = 0
subject.putalpha(Image.fromarray(alpha))
save_subject(subject, 'world.webp')

width, height = subject.size
y, x = np.mgrid[0:height, 0:width]
u, v = x / width, 1 - y / height
body = np.exp(-(((u - .65) / .32) ** 2 + ((v - .31) / .23) ** 2) * 1.7)
head = np.exp(-(((u - .78) / .19) ** 2 + ((v - .46) / .17) ** 2) * 1.8)
castle = np.exp(-(((u - .51) / .18) ** 2 + ((v - .63) / .4) ** 2) * 2)
fin = np.exp(-(((u - .49) / .14) ** 2 + ((v - .15) / .18) ** 2) * 2)
depth = np.clip(body * .53 + head * .32 + castle * .2 + fin * .24, 0, 1)
Image.fromarray((depth * 255).astype('uint8')).resize((512, 288)).save(ROOT / 'depth.webp', lossless=True)

sky = Image.open(SOURCE / 'sky.png').convert('RGB')
sky.save(ROOT / 'sky.webp', quality=95)
cloud = sky.convert('RGBA')
pixels = np.asarray(sky).astype(float) / 255
brightness = pixels[:, :, 0]
cloud_alpha = np.clip((brightness - .66) / .27, 0, 1)
cloud_alpha = cloud_alpha * cloud_alpha * (3 - 2 * cloud_alpha)
vertical = np.linspace(0, 1, sky.height)[:, None]
cloud_alpha *= np.clip((vertical - .47) * 7, 0, 1)
cloud.putalpha(Image.fromarray((cloud_alpha * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(.65)))
cloud.save(ROOT / 'clouds.webp', quality=93)
print('Prepared world, relief, sky, and foreground cloud layers.')