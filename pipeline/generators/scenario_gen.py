"""Scenario generator — creates episode scripts from templates and ideas.

This module provides tools to generate complete episode scenarios
either from YAML templates or programmatically. It includes several
built-in scenario generators for different content types:

1. AI Cartoon Series (fruit/vegetable soap opera)
2. Business Mascot content
3. Character Remix (famous characters in viral contexts)
"""

from __future__ import annotations

import random
from pathlib import Path
from typing import Any

import yaml
from jinja2 import Template

from pipeline.config import ScenarioConfig, SceneConfig
from pipeline.utils.logger import get_logger

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Template-based generation
# ---------------------------------------------------------------------------

def load_scenario_template(template_path: Path) -> str:
    """Load a Jinja2 scenario template."""
    return Path(template_path).read_text(encoding="utf-8")


def render_scenario(template_str: str, variables: dict[str, Any]) -> ScenarioConfig:
    """Render a Jinja2 template and parse it as a ScenarioConfig."""
    rendered = Template(template_str).render(**variables)
    data = yaml.safe_load(rendered)
    return ScenarioConfig.model_validate(data.get("scenario", data))


# ---------------------------------------------------------------------------
# Built-in scenario generators
# ---------------------------------------------------------------------------

class FruitSoapOperaGenerator:
    """Generates episodes for the 'fruit/vegetable family drama' format.

    This is the trending Russian Instagram format where anthropomorphized
    fruits/vegetables have soap opera storylines.
    """

    CHARACTERS = {
        "Папа Клубничка": "A stern but loving strawberry father wearing a tiny hat, cartoon style, anthropomorphic fruit character with arms and legs, expressive face",
        "Мама Клубничка": "A beautiful strawberry mother with eyelashes and lipstick, cartoon style, anthropomorphic fruit character, wearing a small apron",
        "Дядя Огурец": "A tall cucumber man with a mustache, wearing a business suit, cartoon style, anthropomorphic vegetable character, looking suspicious",
        "Бабушка Тыква": "An old pumpkin grandmother with glasses and a knitted shawl, cartoon style, anthropomorphic vegetable, warm and wise looking",
        "Сын Помидорчик": "A small tomato boy, cute and round, cartoon style, anthropomorphic vegetable child, wearing a baseball cap",
        "Соседка Морковка": "A gossip carrot woman, tall and thin, cartoon style, anthropomorphic vegetable, always looking around corners",
    }

    PLOTLINES = [
        {
            "title": "Тайна на кухне",
            "scenes": [
                ("Папа Клубничка приходит домой и видит странную записку", "kitchen scene"),
                ("Мама Клубничка нервничает и прячет телефон", "living room scene"),
                ("Сын Помидорчик случайно находит подарок", "bedroom scene"),
                ("Оказывается — это был сюрприз на день рождения!", "surprise party scene"),
            ],
        },
        {
            "title": "Новый сосед",
            "scenes": [
                ("В дом рядом заезжает Дядя Огурец", "moving day, new neighbor"),
                ("Соседка Морковка сплетничает о новом жильце", "over the fence gossip"),
                ("Папа Клубничка приглашает соседа на ужин", "dinner invitation"),
                ("На ужине выясняется, что Огурец — старый друг Бабушки Тыквы", "dramatic dinner reveal"),
            ],
        },
        {
            "title": "Школьные проблемы",
            "scenes": [
                ("Сын Помидорчик не хочет идти в школу", "morning argument kitchen"),
                ("Мама Клубничка переживает и звонит учительнице", "phone call worry"),
                ("Бабушка Тыква рассказывает историю из своей юности", "grandmother storytelling"),
                ("Помидорчик находит нового друга и всё налаживается", "school playground, happy ending"),
            ],
        },
        {
            "title": "Загадочное исчезновение",
            "scenes": [
                ("Бабушкин фирменный пирог пропал из холодильника!", "empty fridge, shocked faces"),
                ("Каждый в семье подозревает другого", "accusation scene, dramatic"),
                ("Соседка Морковка видела что-то ночью", "nighttime spying"),
                ("Виновник — домашний питомец, хомячок Кабачок!", "cute hamster reveal, funny"),
            ],
        },
        {
            "title": "Семейный отпуск",
            "scenes": [
                ("Семья собирает чемоданы — все хотят ехать в разные места", "packing chaos"),
                ("В машине все спорят — вправо или влево", "car ride argument"),
                ("Машина ломается у красивого озера", "broken car by a lake"),
                ("Оказывается, это лучшее место для отдыха!", "happy family picnic by lake"),
            ],
        },
    ]

    def generate(
        self,
        series_name: str = "Семейка Ягодок",
        episode_number: int = 1,
        plotline_index: int | None = None,
    ) -> ScenarioConfig:
        """Generate a complete soap opera episode scenario."""
        if plotline_index is None:
            plotline_index = (episode_number - 1) % len(self.PLOTLINES)

        plot = self.PLOTLINES[plotline_index]

        scenes = []
        for i, (description, visual_context) in enumerate(plot["scenes"]):
            # Determine which characters are in this scene
            chars_in_scene = [
                name for name in self.CHARACTERS
                if any(word in description for word in name.split())
            ]

            char_prompt_parts = [
                f"{name}" for name in chars_in_scene
            ] if chars_in_scene else ["fruit and vegetable characters"]

            image_prompt = (
                f"{', '.join(char_prompt_parts)} in a {visual_context}, "
                f"cartoon style, colorful, animated, 3D render, Pixar style, "
                f"dramatic lighting, expressive characters"
            )

            scenes.append(SceneConfig(
                scene_id=f"scene_{i+1:02d}",
                description=description,
                image_prompt=image_prompt,
                voiceover_text=description,
                duration=5.0,
                camera_motion="slow zoom in" if i == 0 else "",
                transition="crossfade" if i < len(plot["scenes"]) - 1 else "fade_black",
            ))

        return ScenarioConfig(
            title=plot["title"],
            series_name=series_name,
            episode_number=episode_number,
            style_prompt=(
                "3D cartoon render, Pixar animation style, vibrant colors, "
                "anthropomorphic fruit and vegetable characters with expressive faces, "
                "cute and funny, high quality, detailed"
            ),
            negative_prompt="realistic, photo, blurry, low quality, text, watermark, ugly, deformed",
            character_descriptions=self.CHARACTERS,
            scenes=scenes,
        )


class CharacterRemixGenerator:
    """Generates viral character remix scenarios.

    Takes famous characters and places them in unexpected,
    trending contexts for viral short-form content.
    """

    CHARACTERS = {
        "Шрек": "Shrek the green ogre from the animated movie, highly detailed, recognizable",
        "Эльза": "Elsa from Frozen, ice queen with blonde braid, blue dress, magical",
        "Губка Боб": "SpongeBob SquarePants, yellow sponge, big eyes, square body",
        "Чебурашка": "Cheburashka, cute brown creature with big round ears, Soviet cartoon character",
        "Маша": "Masha from Masha and the Bear, small girl in pink headscarf, mischievous",
    }

    CONTEXTS = [
        {
            "context": "recording a rap album in a studio",
            "visual": "professional music studio, microphone, headphones, mixing board, dramatic lighting",
            "scenes_template": [
                ("{char} входит в студию звукозаписи как настоящая звезда", "entering recording studio, confident pose"),
                ("{char} надевает наушники и начинает читать рэп", "recording with microphone, passionate"),
                ("{char} слушает свой трек и танцует", "dancing in studio, celebrating"),
                ("{char} выходит из студии — фанаты ждут у входа!", "crowd outside studio, celebrity moment"),
            ],
        },
        {
            "context": "working as a food delivery courier",
            "visual": "city streets, delivery bag, scooter, urban environment",
            "scenes_template": [
                ("{char} получает заказ на телефон — срочная доставка!", "looking at phone, delivery bag on back"),
                ("{char} мчится по городу на самокате", "riding scooter through city, speed motion"),
                ("{char} доставляет еду и получает 1 звезду", "angry customer at door, sad face"),
                ("{char} решает открыть свой ресторан!", "dreaming of own restaurant, lightbulb moment"),
            ],
        },
        {
            "context": "becoming a fitness influencer",
            "visual": "gym, workout equipment, mirror selfie, protein shake",
            "scenes_template": [
                ("{char} решает стать фитнес-блогером", "looking in mirror, motivated"),
                ("{char} тренируется в зале — все в шоке!", "gym workout, impressive strength"),
                ("{char} снимает видео для своих подписчиков", "filming workout with phone, posing"),
                ("{char} набирает миллион подписчиков!", "celebration, confetti, phone with followers"),
            ],
        },
    ]

    def generate(
        self,
        character_name: str = "Шрек",
        context_index: int = 0,
        episode_number: int = 1,
    ) -> ScenarioConfig:
        """Generate a character remix scenario."""
        char_desc = self.CHARACTERS.get(
            character_name,
            f"{character_name}, famous character, highly detailed"
        )
        ctx = self.CONTEXTS[context_index % len(self.CONTEXTS)]

        scenes = []
        for i, (desc_template, visual_template) in enumerate(ctx["scenes_template"]):
            desc = desc_template.format(char=character_name)
            visual = visual_template

            image_prompt = (
                f"{character_name} ({char_desc}), {visual}, "
                f"{ctx['visual']}, "
                f"high quality digital art, cinematic lighting, viral content style"
            )

            scenes.append(SceneConfig(
                scene_id=f"scene_{i+1:02d}",
                description=desc,
                image_prompt=image_prompt,
                voiceover_text=desc,
                duration=5.0,
                transition="crossfade" if i < len(ctx["scenes_template"]) - 1 else "fade_black",
            ))

        return ScenarioConfig(
            title=f"{character_name}: {ctx['context']}",
            series_name=f"Приключения {character_name}",
            episode_number=episode_number,
            style_prompt=(
                "cinematic digital art, highly detailed, dramatic lighting, "
                "viral social media content style, engaging and eye-catching"
            ),
            negative_prompt="blurry, low quality, text, watermark, deformed, amateur",
            character_descriptions={character_name: char_desc},
            scenes=scenes,
        )


class MascotContentGenerator:
    """Generates business mascot content for brand promotion.

    Creates scenarios where a custom mascot character talks about
    business-related topics in an engaging, fun format.
    """

    BUSINESS_TYPES = {
        "недвижимость": {
            "mascot": "Дом Домыч",
            "mascot_desc": "A friendly cartoon house character with a face, arms and legs, wearing a hard hat, cute and professional",
            "topics": [
                {
                    "title": "Как выбрать квартиру мечты",
                    "scenes": [
                        ("Привет! Я Дом Домыч, и сегодня покажу, как выбрать идеальную квартиру!", "cute house mascot waving"),
                        ("Совет первый: смотрите на район! Рядом должны быть школы, магазины и парки", "map with highlighted areas, neighborhood view"),
                        ("Совет второй: проверяйте документы! Это важнее красивых обоев", "documents and magnifying glass"),
                        ("Хотите найти квартиру мечты? Обращайтесь к нам!", "mascot with phone number, friendly"),
                    ],
                },
                {
                    "title": "Топ-3 ошибки при покупке квартиры",
                    "scenes": [
                        ("Дом Домыч расскажет о трёх главных ошибках покупателей!", "mascot with warning sign"),
                        ("Ошибка 1: Не проверять юридическую чистоту квартиры", "shocked mascot, red warning"),
                        ("Ошибка 2: Забывать про скрытые расходы — ремонт, налоги, коммуналка", "calculator and money flying away"),
                        ("Ошибка 3: Торопиться! Квартиру выбирают головой, а не сердцем", "mascot thinking, lightbulb"),
                    ],
                },
            ],
        },
        "автосервис": {
            "mascot": "Гаечка",
            "mascot_desc": "A cute cartoon wrench character with a face, wearing a mechanic cap, friendly and knowledgeable, animated tool character",
            "topics": [
                {
                    "title": "5 звуков, которые нельзя игнорировать",
                    "scenes": [
                        ("Привет, я Гаечка! Расскажу, какие звуки машины нельзя игнорировать!", "wrench mascot, garage background"),
                        ("Скрежет при торможении — срочно проверяйте колодки!", "brake system illustration, warning"),
                        ("Стук под капотом — может быть проблема с двигателем", "engine cutaway, mascot pointing"),
                        ("Слышите странный звук? Приезжайте к нам на диагностику!", "mascot with thumbs up, service center"),
                    ],
                },
            ],
        },
        "кофейня": {
            "mascot": "Бариста Бинни",
            "mascot_desc": "A cute cartoon coffee bean character with barista apron, happy face, holding a tiny cup, warm brown tones",
            "topics": [
                {
                    "title": "Латте, капучино или флэт-уайт?",
                    "scenes": [
                        ("Привет! Я Бариста Бинни, и сейчас объясню разницу!", "coffee bean mascot, cafe background"),
                        ("Латте — много молока, мягкий вкус, для тех кто любит нежность", "latte art, milk pouring"),
                        ("Капучино — пенка как облачко, идеальный баланс!", "cappuccino foam close-up"),
                        ("Флэт-уайт — для настоящих ценителей кофе! Заходите попробовать!", "flat white coffee, mascot inviting"),
                    ],
                },
            ],
        },
    }

    def generate(
        self,
        business_type: str = "недвижимость",
        topic_index: int = 0,
        company_name: str = "",
        episode_number: int = 1,
    ) -> ScenarioConfig:
        """Generate a mascot content scenario for a business type."""
        biz = self.BUSINESS_TYPES.get(business_type)
        if not biz:
            available = ", ".join(self.BUSINESS_TYPES.keys())
            raise ValueError(f"Unknown business type: {business_type}. Available: {available}")

        topic = biz["topics"][topic_index % len(biz["topics"])]
        mascot_name = biz["mascot"]
        mascot_desc = biz["mascot_desc"]

        scenes = []
        for i, (text, visual) in enumerate(topic["scenes"]):
            voiceover = text
            if company_name and i == len(topic["scenes"]) - 1:
                voiceover = voiceover.replace("к нам", f"в {company_name}")

            image_prompt = (
                f"{mascot_name} ({mascot_desc}), {visual}, "
                f"colorful cartoon style, professional branding, "
                f"social media content, engaging and friendly"
            )

            scenes.append(SceneConfig(
                scene_id=f"scene_{i+1:02d}",
                description=text,
                image_prompt=image_prompt,
                voiceover_text=voiceover,
                duration=5.0,
                transition="crossfade" if i < len(topic["scenes"]) - 1 else "fade_black",
            ))

        series = f"Советы от {mascot_name}"
        if company_name:
            series = f"{company_name} | {series}"

        return ScenarioConfig(
            title=topic["title"],
            series_name=series,
            episode_number=episode_number,
            style_prompt=(
                "professional social media content, colorful cartoon mascot, "
                "clean design, branding style, engaging, friendly, "
                "high quality 3D render"
            ),
            negative_prompt="blurry, low quality, text, watermark, deformed, scary",
            character_descriptions={mascot_name: mascot_desc},
            scenes=scenes,
        )

    @classmethod
    def available_businesses(cls) -> list[str]:
        return list(cls.BUSINESS_TYPES.keys())


class CatProgrammerGenerator:
    """Generates episodes about a cat programmer - Barsik.

    Designed for video models with built-in audio (e.g. Grok):
    - video_prompt describes action and motion
    - voiceover_text is narrator voiceover (combined with video_prompt for Grok)
    - image_prompt is a detailed visual description for image generation
    """

    CHARACTER = "Barsik the fluffy orange tabby cat programmer wearing tiny glasses"
    CHARACTER_DESC = (
        "A fluffy orange tabby cat with big expressive green eyes, wearing tiny round glasses, "
        "anthropomorphic, sitting upright, 3D Pixar style, highly detailed fur texture, cute"
    )

    EPISODES = [
        {
            "title": "Обычный день Барсика",
            "scenes": [
                {
                    "description": "Утро",
                    "image_prompt": (
                        "A fluffy orange tabby cat sitting at a desk with multiple monitors showing colorful code, "
                        "wearing tiny round glasses, cozy room with warm morning light streaming through window, "
                        "coffee mug with cat paw print on desk, 3D Pixar style, highly detailed, cute character"
                    ),
                    "video_prompt": (
                        "The cat slowly opens its eyes, yawns showing tiny teeth, stretches its paws, "
                        "then puts on tiny glasses and looks at the monitors with a sleepy but determined expression, "
                        "warm morning light fills the room, slow camera zoom in to the cat's face"
                    ),
                    "voiceover_text": (
                        "Каждое утро кот Барсик садится за компьютер. "
                        "Сегодня нужно починить баг, который не давал ему спать всю ночь."
                    ),
                },
                {
                    "description": "Дебаг",
                    "image_prompt": (
                        "A fluffy orange cat staring intensely at a computer screen full of red error messages and code, "
                        "both paws pressing keys on keyboard, dramatic red lighting from screen illuminating fur, "
                        "frustrated squinting expression, 3D Pixar style, cinematic dramatic lighting"
                    ),
                    "video_prompt": (
                        "The cat frantically types on keyboard with both paws, red error messages flash on screen "
                        "one after another, the cat grabs his head with both paws in frustration, "
                        "dramatic camera shake, intense close-up of the cat's frustrated face"
                    ),
                    "voiceover_text": (
                        "Три часа Барсик искал ошибку в коде. "
                        "Оказалось — он забыл поставить точку с запятой. Одну. Маленькую. Точку."
                    ),
                },
                {
                    "description": "Перерыв",
                    "image_prompt": (
                        "A fluffy orange cat peacefully sleeping curled up on a computer keyboard, "
                        "monitor showing a blue progress bar at 50 percent with text compiling, "
                        "steaming coffee mug with cat paw print nearby, soft warm blue ambient light, "
                        "3D Pixar style, cozy peaceful atmosphere"
                    ),
                    "video_prompt": (
                        "The cat slowly lies down on the keyboard, curls into a ball and falls asleep peacefully, "
                        "on the screen the progress bar slowly moves forward, "
                        "gentle steam rises from the coffee mug, soft camera pan to the right"
                    ),
                    "voiceover_text": (
                        "Пока код компилируется — можно и вздремнуть. "
                        "Барсик — настоящий мастер тайм-менеджмента."
                    ),
                },
                {
                    "description": "Победа",
                    "image_prompt": (
                        "A fluffy orange cat leaping from office chair with both paws raised high in celebration, "
                        "computer screen glowing bright green with large text Build Successful, "
                        "colorful confetti falling everywhere, party atmosphere with streamers, "
                        "3D Pixar style, joyful dynamic pose, energetic composition"
                    ),
                    "video_prompt": (
                        "The cat leaps up from the chair with paws raised triumphantly in the air, "
                        "confetti bursts from above in all colors, the screen flashes bright green, "
                        "the cat does a little victory dance wiggling its body, "
                        "energetic camera zoom out revealing the whole festive celebration scene"
                    ),
                    "voiceover_text": (
                        "Готово! Билд прошёл успешно! "
                        "Барсик — лучший программист в мире. По крайней мере, он сам так считает."
                    ),
                },
            ],
        },
    ]

    def generate(self, episode_number: int = 1) -> ScenarioConfig:
        episode = self.EPISODES[(episode_number - 1) % len(self.EPISODES)]

        scenes = []
        for i, s in enumerate(episode["scenes"]):
            scenes.append(SceneConfig(
                scene_id=f"scene_{i+1:02d}",
                description=s["description"],
                image_prompt=s["image_prompt"],
                video_prompt=s["video_prompt"],
                voiceover_text=s["voiceover_text"],
                duration=5.0,
            ))

        return ScenarioConfig(
            title=episode["title"],
            series_name="Кот-программист Барсик",
            episode_number=episode_number,
            style_prompt=(
                "3D Pixar animation style, highly detailed fur textures, "
                "cinematic lighting, cute anthropomorphic cat character, "
                "cozy tech office environment, vibrant colors"
            ),
            negative_prompt="blurry, low quality, text, watermark, deformed, realistic photo, ugly",
            character_descriptions={"Барсик": self.CHARACTER_DESC},
            scenes=scenes,
        )
