import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Logger } from './logger';

/**
 * Parser for .gitignore files
 * Filters files based on gitignore patterns
 */
export class GitignoreParser {
    private patterns: string[] = [];
    private rootPath: string;
    // Default patterns that should always be ignored (even if not in .gitignore)
    private readonly defaultPatterns: string[] = ['.git/', '.git/**', '**/.git/**', '**/*.git'];

    constructor(rootPath: string) {
        this.rootPath = rootPath;
        this.loadGitignore();
    }

    /**
     * Load and parse .gitignore file
     */
    private loadGitignore(): void {
        const gitignorePath = path.join(this.rootPath, '.gitignore');
        
        if (!fs.existsSync(gitignorePath)) {
            Logger.log('📋 No .gitignore file found');
            return;
        }

        try {
            const content = fs.readFileSync(gitignorePath, 'utf8');
            const lines = content.split('\n');

            for (const line of lines) {
                const trimmed = line.trim();
                
                // Skip empty lines and comments
                if (!trimmed || trimmed.startsWith('#')) {
                    continue;
                }

                // Store pattern (handle negation with !)
                this.patterns.push(trimmed);
            }
            
            Logger.log(`📋 Loaded ${this.patterns.length} patterns from .gitignore`);
            if (this.patterns.length > 0) {
                Logger.log(`   Patterns: ${this.patterns.slice(0, 5).join(', ')}${this.patterns.length > 5 ? '...' : ''}`);
            }
        } catch (error) {
            Logger.error('Error reading .gitignore', error);
        }
    }

    /**
     * Check if a file path should be ignored
     */
    public shouldIgnore(filePath: string): boolean {
        // Normalize path to be relative to root (use forward slashes)
        let relativePath = path.relative(this.rootPath, filePath).replace(/\\/g, '/');
        
        // Also normalize the full file path
        const normalizedFilePath = filePath.replace(/\\/g, '/');
        
        // Quick check for .git files (most common case)
        if (relativePath.includes('.git/') || relativePath.includes('.git\\') || 
            relativePath.startsWith('.git/') || relativePath.startsWith('.git\\') ||
            normalizedFilePath.includes('.git/') || normalizedFilePath.includes('.git\\') ||
            relativePath.endsWith('.git') || normalizedFilePath.endsWith('.git')) {
            return true;
        }
        
        // First check default patterns (always ignore .git files)
        for (const pattern of this.defaultPatterns) {
            if (this.matchesPattern(relativePath, pattern) || 
                this.matchesPattern(normalizedFilePath, pattern) ||
                this.matchesPattern('/' + relativePath, pattern)) {
                return true;
            }
        }
        
        // Then check .gitignore patterns
        if (!this.patterns.length) {
            return false;
        }
        
        let shouldIgnore = false;
        
        // Check each pattern (order matters - later patterns can override)
        for (const pattern of this.patterns) {
            const isNegation = pattern.startsWith('!');
            const cleanPattern = isNegation ? pattern.substring(1) : pattern;
            
            // Check multiple path formats
            const matches = this.matchesPattern(relativePath, cleanPattern) || 
                          this.matchesPattern(normalizedFilePath, cleanPattern) ||
                          this.matchesPattern('/' + relativePath, cleanPattern);
            
            if (matches) {
                if (isNegation) {
                    // Negation pattern - don't ignore
                    shouldIgnore = false;
                } else {
                    // Regular pattern - ignore
                    shouldIgnore = true;
                }
            }
        }

        return shouldIgnore;
    }

    /**
     * Check if a path matches a gitignore pattern
     */
    private matchesPattern(filePath: string, pattern: string): boolean {
        // Remove leading ! if present (for negation)
        const cleanPattern = pattern.startsWith('!') ? pattern.substring(1) : pattern;
        
        // Handle directory patterns (ending with /)
        const isDirectoryPattern = cleanPattern.endsWith('/');
        const patternWithoutSlash = isDirectoryPattern ? cleanPattern.slice(0, -1) : cleanPattern;

        // Simple string matching for common patterns (more reliable)
        // For directory patterns like "node_modules/", match any path containing it
        if (isDirectoryPattern) {
            // Match if path contains the directory pattern (e.g., "node_modules/" matches "node_modules/package.json")
            if (filePath.includes(patternWithoutSlash + '/')) {
                return true;
            }
            // Also match if the path itself is the directory
            if (filePath === patternWithoutSlash || filePath.endsWith('/' + patternWithoutSlash)) {
                return true;
            }
        }
        
        // Check if the pattern appears in the path
        if (filePath.includes(patternWithoutSlash)) {
            // For file patterns, check if it matches the file or directory name
            const pathParts = filePath.split('/');
            return pathParts.some(part => {
                // Handle wildcards
                if (patternWithoutSlash.includes('*')) {
                    const regex = new RegExp('^' + patternWithoutSlash.replace(/\*/g, '.*') + '$');
                    return regex.test(part);
                }
                return part === patternWithoutSlash || part.endsWith(patternWithoutSlash);
            });
        }

        // Try regex matching for complex patterns
        try {
            // Convert gitignore pattern to regex
            let regexPattern = patternWithoutSlash
                // Escape special regex characters except * and ?
                .replace(/[.+^${}()|[\]\\]/g, '\\$&')
                // Convert ** to .* (match any characters including /)
                .replace(/\*\*/g, 'GITIGNORE_DOUBLE_STAR')
                .replace(/\*/g, '[^/]*')
                .replace(/GITIGNORE_DOUBLE_STAR/g, '.*')
                // Convert ? to . (match single character)
                .replace(/\?/g, '.');

            // Handle patterns starting with / (root-relative)
            if (cleanPattern.startsWith('/')) {
                regexPattern = '^' + regexPattern.substring(1);
            } else {
                // Pattern can match anywhere in path
                regexPattern = '(^|/)' + regexPattern;
            }

            // Handle directory patterns
            if (isDirectoryPattern) {
                regexPattern += '(/|$)';
            } else {
                regexPattern += '(/$|$)';
            }

            const regex = new RegExp(regexPattern);
            return regex.test(filePath) || regex.test('/' + filePath);
        } catch (error) {
            // If regex fails, fall back to simple string matching
            return filePath.includes(cleanPattern) || ('/' + filePath).includes(cleanPattern);
        }
    }

    /**
     * Filter an array of file paths, removing ignored files
     */
    public filterFiles(filePaths: string[]): string[] {
        const filtered = filePaths.filter(filePath => {
            return !this.shouldIgnore(filePath);
        });
        // Only log if files were actually filtered out
        const removedCount = filePaths.length - filtered.length;
        if (removedCount > 0) {
            Logger.log(`📋 Gitignore: Filtered ${filePaths.length} files to ${filtered.length} (removed ${removedCount})`);
        }
        return filtered;
    }
}

