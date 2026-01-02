#!/usr/bin/env python3
"""
Script para gerar ícones do aplicativo com arredondamento
"""
from PIL import Image, ImageDraw
import os
import sys

def create_rounded_icon(input_path, output_path, size, corner_radius_percent=15):
    """
    Cria um ícone com cantos arredondados
    
    Args:
        input_path: Caminho da imagem original
        output_path: Caminho de saída
        size: Tamanho da imagem de saída (quadrado)
        corner_radius_percent: Percentual de arredondamento (padrão 15%)
    """
    # Abrir a imagem original
    img = Image.open(input_path)
    
    # Redimensionar mantendo proporção e centralizar
    img = img.convert("RGBA")
    img_resized = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    
    # Calcular dimensões para manter proporção
    if img.width > img.height:
        new_height = size
        new_width = int(size * img.width / img.height)
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        x_offset = (size - new_width) // 2
        y_offset = 0
    else:
        new_width = size
        new_height = int(size * img.height / img.width)
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        x_offset = 0
        y_offset = (size - new_height) // 2
    
    img_resized.paste(img, (x_offset, y_offset), img if img.mode == "RGBA" else None)
    
    # Criar máscara com cantos arredondados
    corner_radius = int(size * corner_radius_percent / 100)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    
    # Desenhar retângulo arredondado
    draw.rounded_rectangle(
        [(0, 0), (size, size)],
        radius=corner_radius,
        fill=255
    )
    
    # Aplicar máscara
    output = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    output.paste(img_resized, (0, 0))
    output.putalpha(mask)
    
    # Salvar
    output.save(output_path, "PNG", optimize=True)
    print(f"✓ Gerado: {output_path} ({size}x{size})")

def main():
    input_path = "assets/icone.png"
    output_dir = "assets"
    
    if not os.path.exists(input_path):
        print(f"Erro: Arquivo não encontrado: {input_path}")
        sys.exit(1)
    
    # Tamanhos necessários
    sizes = {
        "icone_t.png": 1024,  # Ícone principal Expo
        "icon.png": 1024,     # Ícone alternativo
    }
    
    print("Gerando ícones com arredondamento...")
    print(f"Arquivo de entrada: {input_path}")
    print(f"Percentual de arredondamento: 15%")
    print()
    
    for filename, size in sizes.items():
        output_path = os.path.join(output_dir, filename)
        create_rounded_icon(input_path, output_path, size, corner_radius_percent=15)
    
    print()
    print("✓ Todos os ícones foram gerados com sucesso!")
    print()
    print("Próximos passos:")
    print("1. Os ícones foram gerados em assets/")
    print("2. O app.json já está configurado para usar icone_t.png")
    print("3. Execute 'npx expo prebuild --clean' para regenerar os ícones nativos")

if __name__ == "__main__":
    main()










