import type {
  CardResolutionContext,
  CardTemplateVariables,
  CharacterInfoCard,
  ResolvedCharacterInfoCard,
} from '../types/character';
import type { I18nText } from '../types/language';

import { getI18nText } from './i18nText';

/**
 * 角色信息卡片解析器
 * 负责处理卡片的继承、模板填充和变量替换逻辑
 */
export class CharacterCardResolver {
  /**
   * 解析卡片内容
   * @param card 要解析的卡片
   * @param context 解析上下文
   * @param currentLanguage 当前语言，用于i18n变量解析
   * @param visitedCards 已访问的卡片ID集合，用于防止循环引用
   * @returns 解析后的卡片
   */
  public static resolveCard(
    card: CharacterInfoCard,
    context: CardResolutionContext,
    currentLanguage: string,
    visitedCards: Set<string> = new Set(),
  ): ResolvedCharacterInfoCard {
    // 防止循环引用
    if (visitedCards.has(card.id)) {
      throw new Error(`Circular reference detected: ${card.id}`);
    }

    visitedCards.add(card.id);

    try {
      // 基础解析结果
      const resolved: ResolvedCharacterInfoCard = {
        id: card.id,
        title: card.title,
        content: card.content,
        color: card.color,
        resolvedFrom: 'self',
      };

      // 处理 from 引用（优先级最高）
      if (card.from) {
        const fromCard = this.findParentCard(card.from, context);
        if (fromCard) {
          // 递归获取from卡片的原始模板信息和累积变量
          const fromTemplateInfo = this.getCardTemplateInfo(fromCard, context, currentLanguage, new Set(visitedCards));

          // 合并变量：from卡片的累积变量 < 当前卡片的变量（当前优先级更高）
          const mergedVariables = { ...fromTemplateInfo.variables, ...card.variables };

          // 使用合并后的变量填充from卡片的模板内容（如果当前卡片没有提供）
          if (!resolved.title && fromTemplateInfo.title) {
            resolved.title = this.fillVariables(fromTemplateInfo.title, mergedVariables, currentLanguage);
            resolved.resolvedFrom = 'from';
          }
          if (!resolved.content && fromTemplateInfo.content) {
            resolved.content = this.fillVariables(fromTemplateInfo.content, mergedVariables, currentLanguage);
            resolved.resolvedFrom = 'from';
          }
          if (!resolved.color && fromTemplateInfo.color) {
            resolved.color = fromTemplateInfo.color;
            resolved.resolvedFrom = 'from';
          }
        }
      }

      // 处理 template 引用（如果没有from，或者from没有提供某些字段）
      if (card.template) {
        const template = context.templates.get(card.template);
        if (template) {
          // 合并变量：模板默认变量 < 当前卡片变量
          const templateVariables = { ...template.variables, ...card.variables };

          if (!resolved.title && template.title) {
            resolved.title = this.fillVariables(template.title, templateVariables, currentLanguage);
            resolved.resolvedFrom = resolved.resolvedFrom ?? 'template';
          }
          if (!resolved.content && template.content) {
            resolved.content = this.fillVariables(template.content, templateVariables, currentLanguage);
            resolved.resolvedFrom = resolved.resolvedFrom ?? 'template';
          }
          if (!resolved.color && template.color) {
            resolved.color = template.color;
            resolved.resolvedFrom = resolved.resolvedFrom ?? 'template';
          }
        }
      }

      return resolved;
    } finally {
      visitedCards.delete(card.id);
    }
  }

  /**
   * 在父级上下文中查找卡片
   * 按照层级顺序查找：角色级 -> 变体级 -> 图像级
   */
  private static findParentCard(
    cardId: string,
    context: CardResolutionContext,
  ): CharacterInfoCard | null {
    // 首先在角色级别查找
    if (context.characterCards.has(cardId)) {
      return context.characterCards.get(cardId) ?? null;
    }

    // 然后在变体级别查找
    if (context.variantCards.has(cardId)) {
      return context.variantCards.get(cardId) ?? null;
    }

    // 最后在图像级别查找
    if (context.imageCards.has(cardId)) {
      return context.imageCards.get(cardId) ?? null;
    }

    return null;
  }

  /**
   * 获取卡片的模板信息（原始模板内容和累积变量）
   * 递归获取卡片的原始模板内容和所有层级的累积变量
   * @param card 要获取模板信息的卡片
   * @param context 解析上下文
   * @param currentLanguage 当前语言
   * @param visitedCards 已访问的卡片集合，防止循环引用
   * @returns 包含原始模板内容和合并变量的对象
   */
  private static getCardTemplateInfo(
    card: CharacterInfoCard,
    context: CardResolutionContext,
    currentLanguage: string,
    visitedCards: Set<string>,
  ): {
      title?: I18nText | string;
      content?: I18nText | string;
      color?: string;
      variables: CardTemplateVariables;
    } {
    // 防止循环引用
    if (visitedCards.has(card.id)) {
      throw new Error(`Circular reference detected in getCardTemplateInfo: ${card.id}`);
    }

    visitedCards.add(card.id);

    try {
      const result = {
        title: card.title,
        content: card.content,
        color: card.color,
        variables: card.variables ? { ...card.variables } : {},
      };

      // 如果有 from 引用，递归获取源卡片的原始模板信息
      if (card.from) {
        const fromCard = this.findParentCard(card.from, context);
        if (fromCard) {
          const fromTemplateInfo = this.getCardTemplateInfo(fromCard, context, currentLanguage, new Set(visitedCards));

          // 继承源卡片的原始模板内容（如果当前卡片没有提供）
          if (!result.title && fromTemplateInfo.title) {
            result.title = fromTemplateInfo.title;
          }
          if (!result.content && fromTemplateInfo.content) {
            result.content = fromTemplateInfo.content;
          }
          if (!result.color && fromTemplateInfo.color) {
            result.color = fromTemplateInfo.color;
          }

          // 变量继承：源卡片的累积变量 < 当前卡片变量（当前优先级更高）
          result.variables = { ...fromTemplateInfo.variables, ...result.variables };
        }
      }

      // 如果有 template 引用，获取模板的原始内容
      if (card.template) {
        const template = context.templates.get(card.template);
        if (template) {
          // 继承模板的原始内容（如果当前卡片没有提供）
          if (!result.title && template.title) {
            result.title = template.title;
          }
          if (!result.content && template.content) {
            result.content = template.content;
          }
          if (!result.color && template.color) {
            result.color = template.color;
          }

          // 变量继承：模板默认变量 < 已累积的变量（包含from引用的变量）< 当前卡片变量
          result.variables = { ...template.variables, ...result.variables };
        }
      }

      return result;
    } finally {
      visitedCards.delete(card.id);
    }
  }

  /**
   * 填充模板变量
   * @param text 要填充的文本
   * @param variables 变量映射
   * @param currentLanguage 当前语言
   */
  private static fillVariables(
    text: I18nText | string,
    variables: CardTemplateVariables,
    currentLanguage: string,
  ): string {
    // 将所有变量转换为字符串参数集合
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(variables)) {
      params[key] = getI18nText(value, currentLanguage);
    }

    // 直接使用 getI18nText 处理文本和参数替换
    return getI18nText(text, currentLanguage, params);
  }

  /**
   * 构建卡片解析上下文
   * 收集所有层级的卡片，用于 from 引用解析
   * @param character 角色配置对象
   * @param variantId 可选的变体ID
   * @param imageId 可选的图像ID
   * @returns 卡片解析上下文，包含所有层级的卡片和模板映射
   */
  public static buildContext(
    character: any, // CharacterProfile
    variantId?: string,
    imageId?: string,
  ): CardResolutionContext {
    const context: CardResolutionContext = {
      characterCards: new Map(),
      variantCards: new Map(),
      imageCards: new Map(),
      templates: new Map(),
    };

    // 添加模板
    if (character.infoCardTemplates) {
      for (const template of character.infoCardTemplates) {
        context.templates.set(template.id, template);
      }
    }

    // 添加角色级卡片
    if (character.infoCards) {
      for (const card of character.infoCards) {
        context.characterCards.set(card.id, card);
      }
    }

    // 添加变体级卡片
    if (variantId) {
      const variant = character.variants.find((v: any) => v.id === variantId);
      if (variant?.infoCards) {
        for (const card of variant.infoCards) {
          context.variantCards.set(card.id, card);
        }
      }

      // 添加图像级卡片
      if (imageId) {
        const image = variant?.images.find((img: any) => img.id === imageId);
        if (image?.infoCards) {
          for (const card of image.infoCards) {
            context.imageCards.set(card.id, card);
          }
        }
      }
    }

    return context;
  }

  /**
   * 获取最高优先级的卡片（已解析）
   * 优先级：图像级 > 变体级 > 角色级
   *
   * 重要逻辑：
   * - 如果某级别未定义 infoCards 字段 → 使用上级
   * - 如果某级别定义了 infoCards: [] → 显示空，不使用上级
   *
   * @param character 角色配置
   * @param currentLanguage 当前语言，用于i18n变量解析
   * @param variantId 可选的变体ID
   * @param imageId 可选的图像ID
   *
   * @example
   * // 示例1：图像定义了空数组，不会回退到变体级
   * image: { id: "img1", infoCards: [] } → 显示空
   *
   * // 示例2：图像未定义infoCards，会使用变体级
   * image: { id: "img1" } → 使用 variant.infoCards
   */
  public static getResolvedCards(
    character: any, // CharacterProfile
    currentLanguage: string,
    variantId?: string,
    imageId?: string,
  ): ResolvedCharacterInfoCard[] {
    // 首先确定要使用哪一级的卡片
    let cardsToResolve: any[] = [];

    // 按优先级顺序查找：图像级 > 变体级 > 角色级
    // 重要：直接检查原始配置对象中是否定义了 infoCards 字段
    // - 已定义字段 → 使用该级别的卡片（可能为空数组）
    // - 未定义字段 → 向上查找

    // 1. 首先尝试图像级卡片
    if (variantId && imageId) {
      const variant = character.variants.find((v: any) => v.id === variantId);
      const image = variant?.images.find((img: any) => img.id === imageId);

      if (image && 'infoCards' in image) {
        // 图像明确定义了 infoCards 字段（可能是空数组）
        cardsToResolve = image.infoCards ?? [];
      } else if (variant && 'infoCards' in variant) {
        // 如果图像存在但未定义 infoCards，继续向上查找
        // 变体明确定义了 infoCards 字段（可能是空数组）
        cardsToResolve = variant.infoCards ?? [];
      } else {
        // 如果变体也未定义 infoCards，使用角色级
        cardsToResolve = character.infoCards ?? [];
      }
    } else if (variantId) {
      // 2. 如果没有指定图像，尝试变体级卡片
      const variant = character.variants.find((v: any) => v.id === variantId);

      if (variant && 'infoCards' in variant) {
        // 变体明确定义了 infoCards 字段（可能是空数组）
        cardsToResolve = variant.infoCards ?? [];
      } else {
        // 如果变体未定义 infoCards，使用角色级
        cardsToResolve = character.infoCards ?? [];
      }
    } else {
      // 3. 默认使用角色级卡片
      cardsToResolve = character.infoCards ?? [];
    }

    // 构建解析上下文（包含所有层级的卡片，用于 from 引用解析）
    const context = this.buildContext(character, variantId, imageId);

    // 解析选中的卡片
    const resolvedCards: ResolvedCharacterInfoCard[] = [];
    for (const card of cardsToResolve) {
      resolvedCards.push(this.resolveCard(card, context, currentLanguage));
    }

    return resolvedCards;
  }
}
