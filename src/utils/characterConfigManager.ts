import type { CharacterConfigLevel, CharacterProfile, ResolvedCharacterInfoCard } from '../types/character';
import { CharacterCardResolver } from '../utils/characterCardResolver';

/**
 * 角色配置管理器
 * 提供便捷的方法来处理角色配置和信息卡片
 */
export class CharacterConfigManager {
  /**
   * 获取角色的所有信息卡片（已解析）
   * @param character 角色配置
   * @param currentLanguage 当前语言，用于i18n变量解析
   * @param variantId 可选的变体ID
   * @param imageId 可选的图像ID
   * @returns 解析后的信息卡片数组
   */
  public static getCharacterCards(
    character: CharacterProfile,
    currentLanguage: string,
    variantId?: string,
    imageId?: string,
  ): ResolvedCharacterInfoCard[] {
    return CharacterCardResolver.getResolvedCards(character, currentLanguage, variantId, imageId);
  }

  /**
   * 获取特定层级的信息卡片
   * @param character 角色配置
   * @param level 层级类型
   * @param currentLanguage 当前语言，用于i18n变量解析
   * @param variantId 变体ID（当level为'variant'或'image'时需要）
   * @param imageId 图像ID（当level为'image'时需要）
   * @returns 解析后的信息卡片数组
   */
  public static getCardsByLevel(
    character: CharacterProfile,
    level: CharacterConfigLevel,
    currentLanguage: string,
    variantId?: string,
    imageId?: string,
  ): ResolvedCharacterInfoCard[] {
    const context = CharacterCardResolver.buildContext(character, variantId, imageId);
    const resolvedCards: ResolvedCharacterInfoCard[] = [];

    switch (level) {
      case 'character':
        if (character.infoCards) {
          for (const card of character.infoCards) {
            resolvedCards.push(CharacterCardResolver.resolveCard(card, context, currentLanguage));
          }
        }
        break;

      case 'variant':
        if (variantId) {
          const variant = character.variants.find(v => v.id === variantId);
          if (variant?.infoCards) {
            for (const card of variant.infoCards) {
              resolvedCards.push(CharacterCardResolver.resolveCard(card, context, currentLanguage));
            }
          }
        }
        break;

      case 'image':
        if (variantId && imageId) {
          const variant = character.variants.find(v => v.id === variantId);
          const image = variant?.images.find(img => img.id === imageId);
          if (image?.infoCards) {
            for (const card of image.infoCards) {
              resolvedCards.push(CharacterCardResolver.resolveCard(card, context, currentLanguage));
            }
          }
        }
        break;
    }

    return resolvedCards;
  }

  /**
   * 验证角色配置的完整性
   * @param character 角色配置
   * @returns 验证结果
   */
  public static validateCharacterConfig(character: CharacterProfile): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查基本字段
    if (!character.id) {
      errors.push('Character ID cannot be empty');
    }
    if (!character.name) {
      errors.push('Character name cannot be empty');
    }

    // 检查模板引用
    const templateIds = new Set(character.infoCardTemplates?.map(t => t.id) ?? []);

    const checkCardReferences = (cards: any[] | undefined, context: string): void => {
      if (!cards) return;

      for (const card of cards) {
        if (card.template && !templateIds.has(card.template)) {
          errors.push(`Card ${card.id} in ${context} references non-existent template: ${card.template}`);
        }
      }
    };

    // 检查角色级卡片
    checkCardReferences(character.infoCards, 'character');

    // 检查变体级卡片
    for (const variant of character.variants) {
      checkCardReferences(variant.infoCards, `variant ${variant.id}`);

      // 检查图像级卡片
      for (const image of variant.images) {
        checkCardReferences(image.infoCards, `image ${image.id}`);
      }
    }

    // 检查循环引用
    try {
      for (const variant of character.variants) {
        for (const image of variant.images) {
          CharacterCardResolver.getResolvedCards(character, variant.id, image.id);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Circular reference')) {
        errors.push(error.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 获取角色的所有可用模板
   * @param character 角色配置
   * @returns 模板ID到模板对象的映射
   */
  public static getAvailableTemplates(character: CharacterProfile): Map<string, any> {
    const templates = new Map();

    if (character.infoCardTemplates) {
      for (const template of character.infoCardTemplates) {
        templates.set(template.id, template);
      }
    }

    return templates;
  }

  /**
   * 预览卡片内容（用于编辑器或调试）
   * @param character 角色配置
   * @param cardId 卡片ID
   * @param currentLanguage 当前语言
   * @param variantId 可选的变体ID
   * @param imageId 可选的图像ID
   * @returns 预览信息
   */
  public static previewCard(
    character: CharacterProfile,
    cardId: string,
    currentLanguage: string,
    variantId?: string,
    imageId?: string,
  ): { found: boolean; card?: ResolvedCharacterInfoCard; source?: string } {
    const context = CharacterCardResolver.buildContext(character, variantId, imageId);

    // 查找卡片
    let card: any = null;
    let source = '';

    if (context.characterCards.has(cardId)) {
      card = context.characterCards.get(cardId);
      source = 'character';
    } else if (context.variantCards.has(cardId)) {
      card = context.variantCards.get(cardId);
      source = 'variant';
    } else if (context.imageCards.has(cardId)) {
      card = context.imageCards.get(cardId);
      source = 'image';
    }

    if (!card) {
      return { found: false };
    }

    try {
      const resolvedCard = CharacterCardResolver.resolveCard(card, context, currentLanguage);
      return {
        found: true,
        card: resolvedCard,
        source,
      };
    } catch (error) {
      return {
        found: true,
        card: {
          id: card.id,
          title: card.title,
          content: card.content,
          color: card.color,
          resolvedFrom: 'error',
        },
        source: `error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
