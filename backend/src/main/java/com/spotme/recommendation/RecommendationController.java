package com.spotme.recommendation;

import java.util.List;
import java.util.Set;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/exercises")
public class RecommendationController {
  private final RecommendationService recommendations;

  public RecommendationController(RecommendationService recommendations) {
    this.recommendations = recommendations;
  }

  @GetMapping("/{id}/alternatives")
  public List<AlternativeDTO> alternatives(
      @PathVariable long id,
      @RequestParam(defaultValue = "") Set<String> equipment,
      @RequestParam(defaultValue = "false") boolean beginnerOnly) {
    return recommendations.getAlternatives(id, equipment, beginnerOnly);
  }
}
